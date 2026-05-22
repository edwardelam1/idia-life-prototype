import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { stage } from "@/lib/stageLogger";

interface ProposalLite {
  id: string;
  title: string;
  description: string | null;
  lifecycle_phase: "draft" | "active" | "queued" | "executed";
  status: string | null;
  created_at: string;
  end_date: string | null;
  quorum_threshold: number | null;
  on_chain_block?: number;
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

const formatRemaining = (endIso: string | null): { label: string; tone: "live" | "ended" | "none" } => {
  if (!endIso) return { label: "No deadline set", tone: "none" };
  const end = new Date(endIso).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return { label: "Auto-failed · deadline passed", tone: "ended" };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { label: `Auto-fails in ${d}d ${h}h ${m}m`, tone: "live" };
};

const DetailDialog: React.FC<{ proposal: ProposalLite | null; onClose: () => void }> = ({ proposal, onClose }) => {
  const [forVotes, setForVotes] = useState<number>(0);
  const [againstVotes, setAgainstVotes] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [blockNumber] = useState<number | null>(null);


  useEffect(() => {
    if (!proposal) return;
    let alive = true;
    setLoading(true);
    const s = stage("LIFECYCLE_DETAIL", "TALLY");
    s.start({ id: proposal.id });
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("dao_votes")
          .select("vote_type")
          .eq("proposal_id", proposal.id);
        if (error) throw error;
        if (!alive) return;
        const rows = (data || []) as { vote_type: string }[];
        setForVotes(rows.filter((r) => r.vote_type === "for").length);
        setAgainstVotes(rows.filter((r) => r.vote_type === "against").length);
        s.ok();
      } catch (e) {
        s.fail(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [proposal?.id]);

  const quorum = proposal?.quorum_threshold ?? 1000;
  const pct = useMemo(() => Math.min(100, (forVotes / Math.max(1, quorum)) * 100), [forVotes, quorum]);
  const remaining = formatRemaining(proposal?.end_date ?? null);
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
                    {loading ? "…" : `${forVotes} / ${quorum}`} ({pct.toFixed(1)}%)
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
                  remaining.tone === "live" &&
                    "border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-200",
                  remaining.tone === "ended" &&
                    "border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-200",
                  remaining.tone === "none" &&
                    "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300",
                )}
              >
                ⏱ {remaining.label}
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
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<ProposalLite | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchItems = async () => {
      const s = stage("LIFECYCLE_TELEMETRY", "FETCH");
      s.start();
      try {
        const { data, error } = await (supabase
          .from("dao_proposals" as any)
          .select("id, title, description, lifecycle_phase, status, created_at, end_date, quorum_threshold")
          .order("created_at", { ascending: false })
          .limit(8) as any);
        if (error) throw error;
        if (isMounted) setItems((data as any) || []);
        s.ok({ count: data?.length });
      } catch (error: any) {
        s.fail(error);
        toast({ title: "Telemetry Stalled", description: error.message, variant: "destructive" });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchItems();
    const ch = supabase
      .channel("dao_proposals_telemetry")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "dao_proposals" }, () => fetchItems())
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-slate-50/50 dark:bg-muted/30 rounded-2xl border border-slate-100 dark:border-border">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <p className="text-[9px] font-black uppercase tracking-widest text-teal-700/50">Syncing Live Telemetry...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center opacity-40 bg-slate-50 dark:bg-muted/30 rounded-2xl border border-slate-100 dark:border-border space-y-2">
        <Activity className="w-8 h-8 mx-auto text-slate-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Telemetry Detected</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((it) => {
          const meta = PHASE_META[it.lifecycle_phase] || PHASE_META.draft;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelected(it)}
              className="w-full text-left flex items-center gap-4 p-3.5 bg-white dark:bg-card border border-teal-50 dark:border-teal-900/40 shadow-sm rounded-2xl transition-all hover:shadow-md hover:border-teal-200 dark:hover:border-teal-700/60 active:scale-[0.99]"
            >
              <div
                className={cn(
                  "text-lg min-w-10 min-h-10 flex items-center justify-center rounded-xl border shadow-sm",
                  meta.color,
                )}
              >
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-800 dark:text-foreground truncate">{it.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p
                    className={cn(
                      "text-[9px] font-black uppercase tracking-[0.15em]",
                      meta.color.split(" ")[0],
                      meta.color.split(" ")[1] || "",
                    )}
                  >
                    {meta.label}
                  </p>
                  <span className="text-slate-300 dark:text-muted-foreground text-[8px] font-bold tracking-widest uppercase">
                    · {new Date(it.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <DetailDialog proposal={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default LifecycleTelemetry;
