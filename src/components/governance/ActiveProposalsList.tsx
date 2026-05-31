import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel, Loader2, CheckCircle2, ThumbsUp, ThumbsDown, Trash2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateACAHash } from "@/utils/acaGenerator";
import { stage } from "@/lib/stageLogger";
import { governanceService } from "@/services/governanceService";
import ActivateVotingPowerCard from "./ActivateVotingPowerCard";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ethers } from "ethers";
import { PROTOCOL, ACTIVE_DEPLOYMENT, GOVERNOR_ABI } from "@/config/contracts";
import { NETWORKS } from "@/services/walletService";

// Direct-RPC chain state read — snapshot block, dynamic quorum, and live tally.
// Quorum is fetched dynamically per snapshot block so the UI auto-adapts if
// the protocol upgrades to a floating relative quorum in the future.
interface ChainState {
  snapshotBlock: number | null;
  quorum: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  state: number | null;
}

async function readChainState(onChainId?: string | null): Promise<ChainState> {
  const networkKey = ACTIVE_DEPLOYMENT === "mainnet" ? "base" : "baseSepolia";
  const network = NETWORKS[networkKey];
  const rpcUrl = (import.meta.env.VITE_ALCHEMY_RPC_URL as string | undefined) || network.rpcUrl;
  const provider = new ethers.JsonRpcProvider(rpcUrl, network.chainId);
  const gov = new ethers.Contract(PROTOCOL.governor, GOVERNOR_ABI, provider);

  const empty: ChainState = {
    snapshotBlock: null,
    quorum: 0,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    state: null,
  };

  if (!onChainId || onChainId.trim() === "") {
    try {
      const block = await provider.getBlockNumber();
      const rawQ = await gov.quorum(block - 1);
      return { ...empty, quorum: Number(ethers.formatUnits(rawQ, 18)) };
    } catch {
      return empty;
    }
  }

  const snapBlockRaw = await gov.proposalSnapshot(onChainId);
  const snapshotBlock = snapBlockRaw && Number(snapBlockRaw) > 0 ? Number(snapBlockRaw) : null;

  const [rawQuorum, rawVotes, rawState] = await Promise.all([
    snapshotBlock ? gov.quorum(snapBlockRaw) : Promise.resolve(0n),
    gov.proposalVotes(onChainId),
    gov.state(onChainId),
  ]);

  return {
    snapshotBlock,
    quorum: Number(ethers.formatUnits(rawQuorum, 18)),
    againstVotes: Number(ethers.formatUnits(rawVotes[0], 18)),
    forVotes: Number(ethers.formatUnits(rawVotes[1], 18)),
    abstainVotes: Number(ethers.formatUnits(rawVotes[2], 18)),
    state: Number(rawState),
  };
}

// OpenZeppelin Governor state enum:
// 0 Pending · 1 Active · 2 Canceled · 3 Defeated · 4 Succeeded · 5 Queued · 6 Expired · 7 Executed
const STATE_NAME = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
const FINAL_DEFEATED = new Set([2, 3, 6]);
const FINAL_PASSED = new Set([4, 5, 7]);
import {
  authorizeGovernanceAction,
  getAscensionLevel,
  IndemnityViolation,
  LEVEL_LABEL,
  type AscensionLevel,
} from "@/utils/governanceGate";

interface Proposal {
  id: string; // DB uuid when present, else on-chain id (used as React key only)
  proposal_ref: string; // canonical id for dao_votes: on-chain id when anchored, else uuid string
  title: string;
  description: string;
  status: string;
  proposer_id: string | null;
  on_chain_id?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


const ProposalCard: React.FC<{
  proposal: Proposal;
  balance: number;
  votingPower: number | string;
  currentUserId: string | null;
  ascensionLevel: AscensionLevel;
  onChanged: () => void;
}> = ({ proposal, balance, votingPower, currentUserId, ascensionLevel, onChanged }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [hasVoted, setHasVoted] = useState<null | "for" | "against">(null);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [chain, setChain] = useState<ChainState>({
    snapshotBlock: null,
    quorum: 0,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    state: null,
  });

  // Vote-weight allocation dialog state
  const numericVotingPower = parseFloat(votingPower?.toString() || "0");
  const isL3User = ascensionLevel === 3;
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [pendingSupport, setPendingSupport] = useState<"for" | "against" | null>(null);
  const [voteWeight, setVoteWeight] = useState<number>(Math.max(1, Math.floor(numericVotingPower) || 1));

  const openVoteDialog = (support: "for" | "against") => {
    setPendingSupport(support);
    setVoteWeight(Math.max(1, Math.floor(numericVotingPower) || 1));
    setVoteDialogOpen(true);
  };

  const isProposer = !!currentUserId && proposal.proposer_id === currentUserId;
  const canWithdraw = isProposer && voteCount === 0 && hasVoted === null;

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = stage("PROPOSAL_CARD", "META_FETCH");
      s.start({ id: proposal.id });
      try {
        const [{ data: votes }, mine] = await Promise.all([
          (supabase as any).from("dao_votes").select("vote_type, vote_weight").eq("proposal_ref", proposal.proposal_ref),
          currentUserId
            ? (supabase as any)
                .from("dao_votes")
                .select("vote_type")
                .eq("proposal_ref", proposal.proposal_ref)
                .eq("user_id", currentUserId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (!alive) return;
        const rows = (votes || []) as { vote_type: string; vote_weight?: number }[];
        setVoteCount(rows.length);
        setHasVoted(((mine as any)?.data?.vote_type as "for" | "against") ?? null);
        s.ok();
      } catch (e) {
        s.fail(e);
      } finally {
        if (alive) setLoadingMeta(false);
      }
    })();

    // Direct-RPC chain poll: snapshot + dynamic quorum + tally + state.
    // Repolls every 15s so a stalled hydrate self-heals on the next tick.
    const pollChain = async () => {
      try {
        const cs = await readChainState(proposal.on_chain_id);
        if (alive) {
          console.log(
            `[QUORUM_DEBUG] proposal=${proposal.on_chain_id || "(off-chain)"} snap=${cs.snapshotBlock} quorum=${cs.quorum} for=${cs.forVotes} against=${cs.againstVotes} state=${cs.state}`,
          );
          setChain(cs);
        }
      } catch (qErr) {
        console.warn("[PROPOSAL_CARD] direct chain fetch failed", qErr);
      }
    };
    pollChain();
    const iv = setInterval(pollChain, 15000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [proposal.proposal_ref, proposal.on_chain_id, currentUserId]);

  const handleCastVote = async (support: "for" | "against") => {
    console.log(`[BEGIN] handleCastVote execution started | Proposal: ${proposal.id} | Intent: ${support}`);
    const s = stage("VOTE_CAST", support.toUpperCase());
    s.start({ proposalId: proposal.id, level: ascensionLevel });

    // 0. Indemnity gate — Level 1 (Fiduciary Officer) required
    try {
      console.log(`[PROCESS] Validating Indemnity Gate for Ascension Level: ${ascensionLevel}`);
      authorizeGovernanceAction(ascensionLevel, 1, `GOVERNANCE_VOTE:${proposal.id}`);
    } catch (e) {
      const userMsg = e instanceof IndemnityViolation ? e.userMessage : "Insufficient clearance.";
      console.error(`[STALL DETECTED] Indemnity Violation: ${userMsg}`);
      toast({ title: "Clearance Required", description: userMsg, variant: "destructive" });
      s.fail(e);
      return;
    }

    const numericVotingPower = parseFloat(votingPower?.toString() || "0");
    console.log(`[PROCESS] Parsed Sovereign Voting Power: ${numericVotingPower}`);

    // 1. Enforcement of Sovereign Delegation (Added as requested)
    if (!votingPower || numericVotingPower < 1) {
      console.error(`[STALL DETECTED] Insufficient voting power. Detected: ${numericVotingPower}`);
      toast({
        title: "Action Required",
        description: "You must Activate Voting Power before casting a vote.",
        variant: "destructive",
      });
      s.fail("insufficient_voting_power");
      return;
    }

    if (balance < 1) {
      console.error(`[STALL DETECTED] Insufficient IDIA balance. Balance: ${balance}`);
      toast({
        title: "Insufficient IDIA",
        description: "1 IDIA is required to cast a sovereign vote.",
        variant: "destructive",
      });
      s.fail("insufficient_balance");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`[PROCESS] Fetching Supabase Auth User...`);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error(`[STALL DETECTED] Sovereign authentication failed: ${authError?.message}`);
        throw new Error("Sovereign authentication failed.");
      }

      console.log(`[PROCESS] Generating ACA Hash for Ledger Write...`);
      const { hash, payload } = await generateACAHash(user.id, `proposal_vote_${proposal.id}`, [
        "GOVERNANCE_VOTE",
        "LEDGER_WRITE",
      ]);
      console.log(`[PROCESS] ACA Hash Generated: ${hash.substring(0, 8)}...`);

      console.log(`[PROCESS] Inserting Vote into Supabase with weight: ${numericVotingPower}`);
      const voteRow: Record<string, unknown> = {
        proposal_ref: proposal.proposal_ref,
        user_id: user.id,
        vote_type: support,
        vote_weight: numericVotingPower,
        credits_spent: 1,
        aca_hash_key: hash,
        aca_payload: payload,
      };
      // Only set the legacy uuid column when the canonical ref IS a uuid (off-chain draft)
      if (UUID_RE.test(proposal.proposal_ref)) voteRow.proposal_id = proposal.proposal_ref;
      const { error: voteError } = await (supabase as any).from("dao_votes").insert(voteRow);

      if (voteError) {
        if (voteError.code === "23505") {
          console.warn(`[WARNING] Duplicate Vote Detected (Code 23505). Intent already recorded.`);
          toast({ title: "Already Voted", description: "Intent already recorded.", variant: "destructive" });
          setHasVoted(support);
          return;
        }
        console.error(`[STALL DETECTED] Supabase Insert Error: ${voteError.message}`);
        throw voteError;
      }

      // On-chain bridge: when the proposal is anchored to the Governor, also
      // cast the vote on-chain so the ledger and chain stay in sync. Off-chain
      // proposals (no on_chain_id) remain Supabase-only.
      if (proposal.on_chain_id) {
        try {
          console.log(`[PROCESS] Bridging vote to on-chain Governor proposal ${proposal.on_chain_id}`);
          const chainSupport = support === "for" ? 1 : 0;
          const { hash: txHash } = await governanceService.castVote(
            proposal.on_chain_id,
            chainSupport as 0 | 1,
            `ACA:${hash.substring(0, 12)}`,
          );
          console.log(`[PROCESS] On-chain vote tx: ${txHash}`);
        } catch (chainErr: any) {
          console.error(`[VOTE_CAST] ON_CHAIN_BRIDGE_FAILED`, chainErr?.message);
          toast({
            title: "On-chain bridge failed",
            description: chainErr?.message || "Off-chain intent recorded; on-chain vote not submitted.",
            variant: "destructive",
          });
        }
      }


      console.log(`[PROCESS] Executing wallet balance burn RPC...`);
      const { error: burnError } = await (supabase as any).rpc("increment_wallet_balance", {
        target_user_id: user.id,
        amount: -1,
      });
      if (burnError) console.warn("[VOTE_CAST] BURN_WARNING", burnError.message);

      setHasVoted(support);
      setVoteCount((c) => c + 1);
      toast({
        title: "Intent Cast",
        description: `Recorded ${support.toUpperCase()} with ${numericVotingPower} weight · ACA ${hash.substring(0, 8)}…`,
      });
      onChanged();
      s.ok();
      console.log(`[END] handleCastVote execution completed successfully.`);
    } catch (e: any) {
      console.error(`[STALL DETECTED] Unhandled Exception during voting: ${e.message}`);
      s.fail(e);
      toast({ title: "Submission Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const s = stage("PROPOSAL_WITHDRAW", "DELETE");
    s.start({ id: proposal.id });
    setIsWithdrawing(true);
    try {
      // Re-check votes immediately to avoid race
      const { data: latest } = await (supabase as any)
        .from("dao_votes")
        .select("id")
        .eq("proposal_ref", proposal.proposal_ref)
        .limit(1);
      if ((latest || []).length > 0) {
        toast({
          title: "Cannot withdraw",
          description: "Votes have already been cast on this proposal.",
          variant: "destructive",
        });
        onChanged();
        s.fail("votes_present");
        return;
      }
      const { error } = await (supabase as any).from("dao_proposals").delete().eq("id", proposal.id);
      if (error) throw error;
      toast({ title: "Proposal withdrawn", description: "Removed from the active ledger." });
      onChanged();
      s.ok();
    } catch (e: any) {
      s.fail(e);
      toast({ title: "Withdraw failed", description: e.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ── Shared chain-derived display values ────────────────────────────
  const chainName = chain.state != null ? STATE_NAME[chain.state] : null;
  const isActive = chain.state === 1;
  const isFinalDefeated = chain.state != null && FINAL_DEFEATED.has(chain.state);
  const isFinalPassed = chain.state != null && FINAL_PASSED.has(chain.state);
  const isFinal = isFinalDefeated || isFinalPassed;

  // Progress numerator: on-chain For votes when available, else off-chain intents
  const forDisplay = chain.forVotes;
  const againstDisplay = chain.againstVotes;
  const quorumTarget = chain.quorum;
  const pct = quorumTarget > 0 ? Math.min(100, (forDisplay / quorumTarget) * 100) : 0;
  const fmt = (n: number) =>
    n >= 1 ? Math.round(n).toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const SnapshotBadge = chain.snapshotBlock ? (
    <Badge
      variant="outline"
      className="text-[9px] font-black uppercase tracking-widest border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
    >
      Block #{chain.snapshotBlock.toLocaleString()}
    </Badge>
  ) : null;

  const QuorumBar = (
    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
          {isFinal ? "Final Tally" : "Quorum Progress"}
        </span>
        <span className="text-[9px] font-black tracking-widest text-slate-700 dark:text-slate-200 text-right">
          {quorumTarget > 0 ? (
            <>
              {fmt(forDisplay)} / {fmt(quorumTarget)} Votes Reached ({pct.toFixed(1)}%)
            </>
          ) : (
            <>{fmt(forDisplay)} cast · quorum hydrating…</>
          )}
        </span>
      </div>
      <Progress
        value={quorumTarget > 0 ? pct : forDisplay > 0 ? 8 : 0}
        className={`h-2 ${quorumTarget === 0 ? "animate-pulse" : ""}`}
        indicatorClassName={
          quorumTarget === 0
            ? "bg-slate-300 dark:bg-slate-700"
            : isFinalDefeated
              ? "bg-rose-500"
              : isFinalPassed || forDisplay >= quorumTarget
                ? "bg-emerald-500"
                : "bg-[hsl(178,42%,32%)]"
        }
      />
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-0.5">
        <span>✔ For: {fmt(forDisplay)}</span>
        <span>✘ Against: {fmt(againstDisplay)}</span>
      </div>
    </div>
  );

  // ── Minimized view: user has already voted ─────────────────────────
  if (hasVoted) {
    return (
      <Card className="border-teal-50 dark:bg-card dark:border-teal-900/40 shadow-sm rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-foreground truncate">{proposal.title}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Vote cast · {hasVoted.toUpperCase()}
              </p>
            </div>
            <Badge className="bg-teal-600 text-white text-[9px] font-black uppercase">Locked</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {SnapshotBadge}
            {chainName && (
              <Badge
                variant="outline"
                className={`text-[9px] font-black uppercase tracking-widest ${
                  isFinalDefeated
                    ? "border-rose-300 text-rose-600 dark:text-rose-300"
                    : isFinalPassed
                      ? "border-emerald-300 text-emerald-600 dark:text-emerald-300"
                      : "border-orange-300 text-orange-600 dark:text-orange-300"
                }`}
              >
                {chainName}
              </Badge>
            )}
          </div>
          {QuorumBar}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-teal-50 dark:bg-card dark:border-teal-900/40 shadow-sm rounded-3xl overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`text-white text-[9px] font-black uppercase tracking-wider ${
                isFinalDefeated
                  ? "bg-rose-500 hover:bg-rose-600"
                  : isFinalPassed
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {chainName || proposal.status}
            </Badge>
            {SnapshotBadge}
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {voteCount} intent{voteCount === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="font-black text-lg leading-tight text-slate-800 dark:text-foreground">{proposal.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{proposal.description}</p>
        </div>

        {QuorumBar}

        {!isFinal && (
          <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-100/50 dark:border-teal-900/50 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-200">
              Cast Sovereign Vote · {votingPower ? Number(votingPower).toLocaleString() : 0} IDIAX
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleCastVote("for")}
                disabled={isSubmitting || isWithdrawing || loadingMeta}
                className="h-11 bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,25%)] text-white font-black uppercase text-[10px] rounded-full"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                    Vote For
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleCastVote("against")}
                disabled={isSubmitting || isWithdrawing || loadingMeta}
                variant="outline"
                className="h-11 font-black uppercase text-[10px] rounded-full border-slate-300 dark:border-slate-700"
              >
                <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                Vote Against
              </Button>
            </div>
          </div>
        )}

        {canWithdraw && !isFinal && (
          <Button
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            variant="ghost"
            size="sm"
            className="w-full h-9 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full"
          >
            {isWithdrawing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Withdrawing…
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Withdraw Proposal
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};


const ActiveProposalsList: React.FC<{
  balance: number;
  votingPower: number | string;
  refreshTrigger?: number;
  isSelfDelegated?: boolean;
  onDelegationChanged?: () => void | Promise<void>;
}> = ({ balance, votingPower, refreshTrigger = 0, isSelfDelegated = true, onDelegationChanged }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [ascensionLevel, setAscensionLevel] = useState<AscensionLevel>(0);
  const [innerRefresh, setInnerRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      const s = stage("ACTIVE_PROPOSALS", "FETCH_HYBRID");
      s.start();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) setUserId(user?.id ?? null);

        // Hydrate viewer's ascension level from active hats
        if (user && isMounted) {
          const { data: hats } = await (supabase as any)
            .from("dao_hats")
            .select("hat_type")
            .eq("user_id", user.id)
            .eq("eligibility_status", "active")
            .is("revoked_at", null);
          const hatSet = new Set<string>((hats || []).map((h: any) => h.hat_type));
          if (isMounted) setAscensionLevel(getAscensionLevel(hatSet));
        }

        // Sequential to avoid RPC 429s — Supabase first (cheap), then on-chain.
        const dbProposals = await (supabase as any)
          .from("dao_proposals")
          .select("id, title, description, status, proposer_id, on_chain_id")
          .order("created_at", { ascending: false });
        if (dbProposals.error) throw dbProposals.error;

        await delay(400);

        const onChainProposals = await governanceService
          .getRecentProposals(user?.id || "")
          .catch((e) => {
            console.warn("[ACTIVE_PROPOSALS] on-chain fetch failed:", e?.message);
            return [];
          });

        // Index DB rows by on_chain_id to dedupe anchored entries
        const anchoredIds = new Set<string>(
          (dbProposals.data || [])
            .map((r: any) => r.on_chain_id)
            .filter((x: unknown): x is string => typeof x === "string" && x.length > 0),
        );

        const dbRows: Proposal[] = (dbProposals.data || []).map((r: any) => ({
          id: r.id,
          proposal_ref: r.on_chain_id ?? r.id, // on-chain id wins when anchored
          title: r.title,
          description: r.description,
          status: r.status,
          proposer_id: r.proposer_id,
          on_chain_id: r.on_chain_id ?? null,
        }));

        const chainRows: Proposal[] = onChainProposals
          .filter((p) => !anchoredIds.has(p.proposalId))
          .map((p) => ({
            id: p.proposalId,
            proposal_ref: p.proposalId,
            title: p.description.split("\n")[0],
            description: p.description,
            status: p.stateName,
            proposer_id: p.proposer,
            on_chain_id: p.proposalId,
          }));

        const combined = [...dbRows, ...chainRows];

        if (isMounted) setProposals(combined);
        s.ok({ count: combined.length });
      } catch (err: any) {
        s.fail(err);
        toast({ title: "Telemetry Stalled", description: err.message, variant: "destructive" });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, innerRefresh]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600/50">
          Syncing Operational Gateway...
        </p>
      </div>
    );
  }

  if (proposals.length === 0) {
    const showActivateEmpty = !isSelfDelegated && balance > 0;
    return (
      <div className="space-y-5">
        {showActivateEmpty && (
          <ActivateVotingPowerCard
            idiaBalance={balance}
            onActivated={() => {
              onDelegationChanged?.();
              setInnerRefresh((n) => n + 1);
            }}
          />
        )}
        <div className="py-16 text-center opacity-40 space-y-3 bg-slate-50 dark:bg-muted/30 rounded-3xl border border-slate-100 dark:border-border">
          <Gavel className="mx-auto w-10 h-10 text-slate-400" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">No Active Proposals Found</p>
        </div>
      </div>
    );
  }

  const showActivate = !isSelfDelegated && balance > 0;

  return (
    <div className="space-y-5">
      {showActivate && (
        <ActivateVotingPowerCard
          idiaBalance={balance}
          onActivated={() => {
            onDelegationChanged?.();
            setInnerRefresh((n) => n + 1);
          }}
        />
      )}
      <div className="px-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Clearance · {LEVEL_LABEL[ascensionLevel]}
        </span>
      </div>
      {proposals.map((prop) => (
        <ProposalCard
          key={prop.id}
          proposal={prop}
          balance={balance}
          votingPower={votingPower}
          currentUserId={userId}
          ascensionLevel={ascensionLevel}
          onChanged={() => setInnerRefresh((n) => n + 1)}
        />
      ))}
    </div>
  );
};

export default ActiveProposalsList;
