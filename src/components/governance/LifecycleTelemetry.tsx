import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { stage } from "@/lib/stageLogger";
import { governanceService } from "@/services/governanceService";

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

interface LifecycleContextType {
  proposal: ProposalLite | null;
  setProposal: (p: ProposalLite | null) => void;
  forVotes: number;
  againstVotes: number;
  liveQuorum: number;
  loading: boolean;
  deadlineState: { label: string; tone: "live" | "ended" | "none" };
}

const LifecycleContext = createContext<LifecycleContextType | undefined>(undefined);

const useLifecycle = () => {
  const context = useContext(LifecycleContext);
  if (!context) throw new Error("useLifecycle must be used within a LifecycleProvider");
  return context;
};

const PHASE_META = {
  draft: {
    icon: "📝",
    label: "Proposed",
    color: "text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800",
  },
  active: {
    icon: "⚡",
    label: "Live Vote",
    color: "text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50",
  },
  queued: {
    icon: "⏳",
    label: "In Timelock",
    color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50",
  },
  executed: {
    icon: "✅",
    label: "Settled",
    color: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50",
  },
} as const;

const LifecycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proposal, setProposal] = useState<ProposalLite | null>(null);
  const [forVotes, setForVotes] = useState(0);
  const [againstVotes, setAgainstVotes] = useState(0);
  const [liveQuorum, setLiveQuorum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deadlineState, setDeadlineState] = useState({
    label: "Syncing timeline...",
    tone: "none" as "live" | "ended" | "none",
  });

  useEffect(() => {
    if (!proposal) return;
    let alive = true;
    setLoading(true);

    const sChain = stage("LIFECYCLE_DETAIL", "ON_CHAIN_SYNC");
    sChain.start({ id: proposal.id, message: "[START] Synchronizing directly with Base network." });

    (async () => {
      try {
        // Block 1: Tally & Quorum
        let qStr = "0";
        if (proposal.on_chain_id && proposal.on_chain_id.trim() !== "") {
          try {
            qStr = await governanceService.getProposalQuorum(proposal.on_chain_id);
            console.log(`[DEBUG] Snapshot Quorum for ${proposal.on_chain_id}:`, qStr);
          } catch (qErr) {
            console.error("[DEBUG] Quorum RPC Error:", qErr);
            qStr = await governanceService.getCurrentQuorum();
          }
        } else {
          const { data } = await supabase.from("dao_votes").select("vote_type, vote_weight").eq("proposal_id", proposal.id);
          const rows = (data || []) as { vote_type: string; vote_weight?: number }[];
          if (alive) {
            setForVotes(rows.filter((r) => r.vote_type === "for").reduce((acc, r) => acc + Number(r.vote_weight ?? 1), 0));
            setAgainstVotes(rows.filter((r) => r.vote_type === "against").reduce((acc, r) => acc + Number(r.vote_weight ?? 1), 0));
          }
          qStr = await governanceService.getCurrentQuorum();
        }
        if (alive) setLiveQuorum(Number(qStr));

        // Block 2: Timeline
        try {
          const params = await governanceService.getGovernorParams();
          const totalDurationMs = (params.votingDelay + params.votingPeriod) * 2000;
          const endMs = new Date(proposal.created_at).getTime() + totalDurationMs;
          const diff = endMs - Date.now();
          if (alive) {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setDeadlineState({ 
                label: diff <= 0 ? "Voting Closed · Deadline Passed" : `Auto-fails in ${d}d ${h}h ${m}m`, 
                tone: diff <= 0 ? "ended" : "live" 
            });
          }
        } catch (paramErr) {
           console.warn("[LIFECYCLE] Network params unavailable.", paramErr);
           setDeadlineState({ label: "Timeline Unavailable", tone: "none" });
        }
        
        sChain.ok({ message: "[SUCCESS] Synchronization complete." });
      } catch (err) {
        console.error("[LIFECYCLE] Sync failed:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [proposal]);

  return (
    <LifecycleContext.Provider value={{ proposal, setProposal, forVotes, againstVotes, liveQuorum, loading, deadlineState }}>
      {children}
    </LifecycleContext.Provider>
  );
};

const DetailDialog: React.FC = () => {
  const { proposal, setProposal, forVotes, againstVotes, liveQuorum, loading, deadlineState } = useLifecycle();
  
  const pct = useMemo(() => {
    if (liveQuorum === 0) return (forVotes + againstVotes) > 0 ? 100 : 0;
    return Math.min(100, ((forVotes + againstVotes) / liveQuorum) * 100);
  }, [forVotes, againstVotes, liveQuorum]);

  const meta = proposal ? PHASE_META[proposal.lifecycle_phase] || PHASE_META.draft : null;
  const blockNumber = proposal?.on_chain_block || null;

  return (
    <Dialog open={!!proposal} onOpenChange={(open) => !open && setProposal(null)}>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-200">Quorum Progress</span>
                  <span className="text-[10px] font-black tracking-widest text-teal-700 dark:text-teal-200">
                    {loading ? "…" : `${forVotes + againstVotes} / ${liveQuorum}`} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-1">
                  <span>✔ For: {forVotes}</span>
                  <span>✘ Against: {againstVotes}</span>
                </div>
              </div>
              <div className={cn("p-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest", 
                deadlineState.tone === "live" ? "border-orange-100 bg-orange-50/50 text-orange-700" : "border-slate-100 bg-slate-50 text-slate-600")}>
                ⏱ {deadlineState.label}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const LifecycleTelemetryList: React.FC = () => {
  const [items, setItems] = useState<ProposalLite[]>([]);
  const { setProposal } = useLifecycle();

  useEffect(() => {
    supabase
      .from("dao_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data as any[] || []).map(d => ({ ...d, lifecycle_phase: d.lifecycle_phase }))));
  }, []);

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <button key={it.id} onClick={() => setProposal(it)} className="w-full p-4 border rounded-xl text-left hover:bg-slate-50">
          <p className="font-bold">{it.title}</p>
        </button>
      ))}
      <DetailDialog />
    </div>
  );
};

export default function LifecycleTelemetry() {
  return (
    <LifecycleProvider>
      <LifecycleTelemetryList />
    </LifecycleProvider>
  );
}