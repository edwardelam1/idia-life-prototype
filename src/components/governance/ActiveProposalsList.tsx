import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel, Loader2, CheckCircle2, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateACAHash } from "@/utils/acaGenerator";
import { stage } from "@/lib/stageLogger";
import { governanceService } from "@/services/governanceService";

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  proposer_id: string | null;
}

const ProposalCard: React.FC<{
  proposal: Proposal;
  balance: number;
  votingPower: number | string;
  currentUserId: string | null;
  onChanged: () => void;
}> = ({ proposal, balance, votingPower, currentUserId, onChanged }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [hasVoted, setHasVoted] = useState<null | "for" | "against">(null);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const isProposer = !!currentUserId && proposal.proposer_id === currentUserId;
  const canWithdraw = isProposer && voteCount === 0 && hasVoted === null;

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = stage("PROPOSAL_CARD", "META_FETCH");
      s.start({ id: proposal.id });
      try {
        const [{ data: votes }, mine] = await Promise.all([
          (supabase as any).from("dao_votes").select("vote_type").eq("proposal_id", proposal.id),
          currentUserId
            ? (supabase as any)
                .from("dao_votes")
                .select("vote_type")
                .eq("proposal_id", proposal.id)
                .eq("user_id", currentUserId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (!alive) return;
        setVoteCount((votes || []).length);
        setHasVoted(((mine as any)?.data?.vote_type as "for" | "against") ?? null);
        s.ok();
      } catch (e) {
        s.fail(e);
      } finally {
        if (alive) setLoadingMeta(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [proposal.id, currentUserId]);

  const handleCastVote = async (support: "for" | "against") => {
    const s = stage("VOTE_CAST", support.toUpperCase());
    s.start({ proposalId: proposal.id });

    // 1. Enforcement of Sovereign Delegation (Added as requested)
    if (!votingPower || parseFloat(votingPower.toString()) < 1) {
      toast({
        title: "Action Required",
        description: "You must Activate Voting Power before casting a vote.",
        variant: "destructive",
      });
      s.fail("insufficient_voting_power");
      return;
    }

    if (balance < 1) {
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sovereign authentication failed.");

      const { hash, payload } = await generateACAHash(user.id, `proposal_vote_${proposal.id}`, [
        "GOVERNANCE_VOTE",
        "LEDGER_WRITE",
      ]);

      const { error: voteError } = await (supabase as any).from("dao_votes").insert({
        proposal_id: proposal.id,
        user_id: user.id,
        vote_type: support,
        vote_weight: 1,
        credits_spent: 1,
        aca_hash_key: hash,
        aca_payload: payload,
      });
      if (voteError) {
        if (voteError.code === "23505") {
          toast({ title: "Already Voted", description: "Intent already recorded.", variant: "destructive" });
          setHasVoted(support);
          return;
        }
        throw voteError;
      }

      const { error: burnError } = await (supabase as any).rpc("increment_wallet_balance", {
        target_user_id: user.id,
        amount: -1,
      });
      if (burnError) console.warn("[VOTE_CAST] BURN_WARNING", burnError.message);

      setHasVoted(support);
      setVoteCount((c) => c + 1);
      toast({
        title: "Intent Cast",
        description: `Recorded ${support.toUpperCase()} · ACA ${hash.substring(0, 8)}…`,
      });
      onChanged();
      s.ok();
    } catch (e: any) {
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
        .eq("proposal_id", proposal.id)
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

  // ── Minimized view: user has already voted ─────────────────────────
  if (hasVoted) {
    return (
      <Card className="border-teal-50 dark:bg-card dark:border-teal-900/40 shadow-sm rounded-2xl opacity-70">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-foreground truncate">{proposal.title}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Vote cast · {hasVoted.toUpperCase()}
            </p>
          </div>
          <Badge className="bg-teal-600 text-white text-[9px] font-black uppercase">Locked</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-teal-50 dark:bg-card dark:border-teal-900/40 shadow-sm rounded-3xl overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-wider">
              {proposal.status}
            </Badge>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {voteCount} vote{voteCount === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="font-black text-lg leading-tight text-slate-800 dark:text-foreground">{proposal.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{proposal.description}</p>
        </div>

        <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-100/50 dark:border-teal-900/50 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-200">
            Cast Sovereign Vote · 1 IDIA
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

        {canWithdraw && (
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

const ActiveProposalsList: React.FC<{ balance: number; votingPower: number | string; refreshTrigger?: number }> = ({
  balance,
  votingPower,
  refreshTrigger = 0,
}) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [innerRefresh, setInnerRefresh] = useState(0);

  useEffect(() => {
  let isMounted = true;
  (async () => {
    const s = stage("ACTIVE_PROPOSALS", "FETCH_HYBRID");
    s.start();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) setUserId(user?.id ?? null);

      // Fetch from both sources
      const [dbProposals, onChainProposals] = await Promise.all([
        (supabase as any)
          .from("dao_proposals")
          .select("id, title, description, status, proposer_id")
          .order("created_at", { ascending: false }),
        governanceService.getRecentProposals(user?.id || "")
      ]);

      if (dbProposals.error) throw dbProposals.error;

      // Merge logic: Index on-chain IDs to avoid duplicates if necessary
      const combined = [
  ...(dbProposals.data || []),
  ...onChainProposals.map(p => ({
    id: p.proposalId,
    title: p.description.split('\n')[0], // Extract title from description if needed
    description: p.description,
    status: p.stateName,
    proposer_id: p.proposer
  }))
];
      // Logic to append or reconcile onChainProposals goes here
      
      if (isMounted) setProposals(combined);
      s.ok({ count: combined.length });
    } catch (err: any) {
      s.fail(err);
      toast({ title: "Telemetry Stalled", description: err.message, variant: "destructive" });
    } finally {
      if (isMounted) setLoading(false);
    }
  })();
  return () => { isMounted = false; };
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
    return (
      <div className="py-16 text-center opacity-40 space-y-3 bg-slate-50 dark:bg-muted/30 rounded-3xl border border-slate-100 dark:border-border">
        <Gavel className="mx-auto w-10 h-10 text-slate-400" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">No Active Proposals Found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {proposals.map((prop) => (
        <ProposalCard
          key={prop.id}
          proposal={prop}
          balance={balance}
          votingPower={votingPower}
          currentUserId={userId}
          onChanged={() => setInnerRefresh((n) => n + 1)}
        />
      ))}
    </div>
  );
};

export default ActiveProposalsList;
