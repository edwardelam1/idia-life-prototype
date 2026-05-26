import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { stage } from "@/lib/stageLogger";
import { governanceService } from "@/services/governanceService";
import { ethers } from "ethers";

interface ProposalLite {
  id: string;
  title: string;
  description: string | null;
  lifecycle_phase: "draft" | "active" | "queued" | "executed";
  status: string | null;
  created_at: string;
  end_date: string | null;
  quorum_threshold: number | null;
  on_chain_block?: number | null;
  on_chain_id?: string | null;
}

const PHASE_META = {
  draft: {
    icon: "📝",
    label: "Proposed",
    color: "text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800",
  },
  active: {
    icon: "⚡",
    label: "Live Vote",
    color:
      "text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50",
  },
  queued: {
    icon: "⏳",
    label: "In Timelock",
    color:
      "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50",
  },
  executed: {
    icon: "✅",
    label: "Settled",
    color: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50",
  },
} as const;

const DetailDialog: React.FC<{ proposal: ProposalLite | null; onClose: () => void }> = ({ proposal, onClose }) => {
  const [forVotes, setForVotes] = useState<number>(0);
  const [againstVotes, setAgainstVotes] = useState<number>(0);
  const [liveQuorum, setLiveQuorum] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [deadlineState, setDeadlineState] = useState({
    label: "Syncing...",
    tone: "none" as "live" | "ended" | "none",
  });

  const blockNumber = proposal?.on_chain_block || null;

  useEffect(() => {
    if (!proposal) return;
    let alive = true;
    setLoading(true);

    const sChain = stage("LIFECYCLE_DETAIL", "ON_CHAIN_SYNC");
    sChain.start({ id: proposal.id, message: "[START] Synchronizing directly with Base network." });

    (async () => {
      // BLOCK 1: TALLY & QUORUM
      try {
        let qStr = "0";
        if (proposal.on_chain_id && proposal.on_chain_id.trim() !== "") {
          console.log(`[QUORUM_DEBUG] Fetching On-Chain Quorum for ProposalID: ${proposal.on_chain_id}`);
          qStr = await governanceService.getProposalQuorum(proposal.on_chain_id);
          console.log(`[QUORUM_DEBUG] Raw RPC Result received: ${qStr}`);
        } else {
          console.log(`[QUORUM_DEBUG] No on_chain_id. Falling back to Supabase votes.`);
          const { data } = await supabase
            .from("dao_votes")
            .select("vote_type, vote_weight")
            .eq("proposal_id", proposal.id);
          const rows = (data || []) as { vote_type: string; vote_weight?: number }[];
          if (alive) {
            const f = rows.filter((r) => r.vote_type === "for").reduce((acc, r) => acc + Number(r.vote_weight ?? 1), 0);
            const a = rows.filter((r) => r.vote_type === "against").reduce((acc, r) => acc + Number(r.vote_weight ?? 1), 0);
            setForVotes(f);
            setAgainstVotes(a);
            console.log(`[QUORUM_DEBUG] Calculated local votes: For=${f}, Against=${a}`);
          }
          qStr = await governanceService.getCurrentQuorum();
          console.log(`[QUORUM_DEBUG] Current Quorum fallback returned: ${qStr}`);
        }

        if (alive) {
          console.log(`[QUORUM_DEBUG] Setting state liveQuorum: ${Number(qStr)}`);
          setLiveQuorum(Number(qStr));
        }
      } catch (tallyErr) {
        console.error("[LIFECYCLE] Quorum sync failed:", tallyErr);
      }

      // BLOCK 2: TIMELINE
      try {
        const SECONDS_PER_BLOCK = 2; 
        const VOTING_DELAY_BLOCKS = 43200;
        const VOTING_PERIOD_BLOCKS = 302400;
        
        const totalDurationSec = (VOTING_DELAY_BLOCKS + VOTING_PERIOD_BLOCKS) * SECONDS_PER_BLOCK;
        const endMs = new Date(proposal.created_at).getTime() + (totalDurationSec * 1000);
        const diff = endMs - Date.now();

        if (alive) {
          if (diff <= 0) {
            setDeadlineState({ label: "Voting Closed · Deadline Passed", tone: "ended" });
          } else {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setDeadlineState({ label: `Auto-fails in ${d}d ${h}h ${m}m`, tone: "live" });
          }
        }
      } catch (timelineErr) {
        console.error("[LIFECYCLE] Timeline calculation failed:", timelineErr);
        if (alive) setDeadlineState({ label: "Timeline Unavailable", tone: "none" });
      }

      sChain.ok({ message: "[SUCCESS] Synchronization complete." });
      if (alive) setLoading(false);
    })();

    return () => { alive = false; };
  }, [proposal]);

  const activeQuorum = liveQuorum;
  const totalVotes = forVotes + againstVotes;

  const pct = useMemo(() => {
    if (activeQuorum === 0) return totalVotes > 0 ? 100 : 0;
    return Math.min(100, (totalVotes / activeQuorum) * 100);
  }, [totalVotes, activeQuorum]);

  const meta = proposal ? PHASE_META[proposal.lifecycle_phase] || PHASE_META.draft : null;

  return (
    <Dialog open={!!proposal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        {proposal && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                {meta && (
                  <Badge className={cn("text-[9px] font-black uppercase tracking-widest border", meta.color)}>
                    {meta.icon} {meta.label}
                  </Badge>
                )}
                {proposal.status && (
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                    {proposal.status}
                  </Badge>
                )}
              </div>
              <DialogTitle className="font-black text-lg leading-tight text-foreground">{proposal.title}</DialogTitle>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <Activity className="w-3 h-3" />
                {blockNumber ? <span>Block: #{blockNumber}</span> : <span>Block: Pending Chain Sync</span>}
              </div>
              <DialogDescription className="text-xs whitespace-pre-wrap text-muted-foreground">
                {proposal.description || "No description provided."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-200">
                    Quorum Progress
                  </span>
                  <span className="text-[10px] font-black tracking-widest text-teal-700 dark:text-teal-200">
                    {loading ? "…" : `${totalVotes} / ${activeQuorum}`} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-1">
                  <span>✔ For: {forVotes}</span>
                  <span>✘ Against: {againstVotes}</span>
                </div>
              </div>

              <div
                className={cn(
                  "p-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest",
                  deadlineState.tone === "live" &&
                    "border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-200",
                  deadlineState.tone === "ended" &&
                    "border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-200",
                  deadlineState.tone === "none" &&
                    "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300",
                )}
              >
                ⏱ {deadlineState.label}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const LifecycleTelemetry: React.FC = () => {
  const [items, setItems] = useState<ProposalLite[]>([]);
  const [selected, setSelected] = useState<ProposalLite | null>(null);

  useEffect(() => {
    supabase
      .from("dao_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setItems(
            (data as any[]).map((item) => ({
              ...item,
              lifecycle_phase: item.lifecycle_phase as "draft" | "active" | "queued" | "executed",
            }))
          );
        }
      });
  }, []);

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setSelected(it)}
          className="w-full p-4 border rounded-xl text-left hover:bg-slate-50"
        >
          <p className="font-bold">{it.title}</p>
        </button>
      ))}
      <DetailDialog proposal={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default LifecycleTelemetry;