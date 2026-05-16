import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProposalLite {
  id: string;
  title: string;
  lifecycle_phase: "draft" | "active" | "queued" | "executed";
  created_at: string;
}

const PHASE_META = {
  draft: { icon: "📝", label: "Proposed", color: "text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800" },
  active: { icon: "⚡", label: "Live Vote", color: "text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50" },
  queued: { icon: "⏳", label: "In Timelock", color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50" },
  executed: { icon: "✅", label: "Settled", color: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50" },
} as const;

const LifecycleTelemetry: React.FC = () => {
  const [items, setItems] = useState<ProposalLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchItems = async () => {
      console.log("[LIFECYCLE_TELEMETRY] START: Syncing protocol lifecycle state.");
      try {
        const { data, error } = await (supabase
          .from("dao_proposals" as any)
          .select("id, title, lifecycle_phase, created_at")
          .order("created_at", { ascending: false })
          .limit(8) as any);

        if (error) {
          throw error;
        }

        if (isMounted) {
          console.log(`[LIFECYCLE_TELEMETRY] SUCCESS: Retrieved ${data?.length || 0} ledger entries.`);
          setItems((data as any) || []);
        }
      } catch (error: any) {
        console.error(`[LIFECYCLE_TELEMETRY] CRITICAL_FAILURE: Telemetry sync stalled. Reason: ${error.message}`);
        toast({
          title: "Telemetry Stalled",
          description: "Failed to load live protocol lifecycle feed.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log("[LIFECYCLE_TELEMETRY] END: Sync execution thread terminated.");
        }
      }
    };

    // Initial Fetch
    fetchItems();

    // Establish Real-Time Socket Connection
    console.log("[LIFECYCLE_TELEMETRY] SOCKET_START: Establishing real-time connection to Wyoming Gateway.");
    const ch = supabase
      .channel("dao_proposals_telemetry")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "dao_proposals" }, (payload) => {
        console.log(
          "[LIFECYCLE_TELEMETRY] SOCKET_EVENT: Real-time mutation detected on ledger. Re-syncing...",
          payload,
        );
        fetchItems();
      })
      .subscribe((status) => {
        console.log(`[LIFECYCLE_TELEMETRY] SOCKET_STATUS: Gateway socket state -> ${status}`);
      });

    return () => {
      isMounted = false;
      console.log("[LIFECYCLE_TELEMETRY] SOCKET_CLOSE: Tearing down real-time connection.");
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
    <div className="space-y-3">
      {items.map((it) => {
        // Fallback to draft if the phase isn't recognized
        const meta = PHASE_META[it.lifecycle_phase] || PHASE_META.draft;

        return (
          <div
            key={it.id}
            className="flex items-center gap-4 p-3.5 bg-white dark:bg-card border border-teal-50 dark:border-teal-900/40 shadow-sm rounded-2xl transition-all hover:shadow-md"
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
                <p className={cn("text-[9px] font-black uppercase tracking-[0.15em]", meta.color.split(" ")[0], meta.color.split(" ")[1] || "")}>
                  {meta.label}
                </p>
                <span className="text-slate-300 dark:text-muted-foreground text-[8px] font-bold tracking-widest uppercase">
                  · {new Date(it.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LifecycleTelemetry;
