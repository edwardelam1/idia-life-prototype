import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Zap, AlertOctagon, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface MSA {
  id: string;
  sla_name: string;
  target_value: number | null;
  current_value: number | null;
  status: "meeting" | "warning" | "breach";
}

const dotColor = (s: string) =>
  s === "meeting"
    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
    : s === "warning"
      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"
      : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse";

const textColor = (s: string) =>
  s === "meeting" 
    ? "text-emerald-700 dark:text-emerald-300" 
    : s === "warning" 
      ? "text-amber-700 dark:text-amber-300" 
      : "text-red-700 dark:text-red-300";

const statusLabel = (s: string) =>
  s === "meeting" ? "Optimal" : s === "warning" ? "Latency Drift" : "SLA Breach";

const MSAComplianceCard: React.FC = () => {
  const [items, setItems] = useState<MSA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async (showToast: boolean = false) => {
    if (showToast) setIsRefreshing(true);
    console.log("[NETWORK_TELEMETRY] START: Syncing Oracle performance metrics.");
    try {
      const { data, error } = await (supabase as any)
        .from("dao_msa_metrics")
        .select("*")
        .order("measured_at", { ascending: false });

      if (error) throw error;

      console.log(`[NETWORK_TELEMETRY] SUCCESS: Retrieved ${data?.length || 0} telemetry streams.`);
      setItems(data || []);
    } catch (err: any) {
      console.error(`[NETWORK_TELEMETRY] CRITICAL_FAILURE: Sync stalled. Reason: ${err.message}`);
      if (showToast) {
        toast({
          title: "Telemetry Sync Failed",
          description: "Could not retrieve live network performance data.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      console.log("[NETWORK_TELEMETRY] END: Sync thread terminated.");
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Establish Real-Time Socket Connection
    console.log("[NETWORK_TELEMETRY] SOCKET_START: Establishing real-time connection to Oracle.");
    const ch = supabase
      .channel("msa_metrics_telemetry")
      .on(
        "postgres_changes" as any, 
        { event: "*", schema: "public", table: "dao_msa_metrics" }, 
        (payload) => {
          console.log("[NETWORK_TELEMETRY] SOCKET_EVENT: Mutation detected. Refreshing...");
          fetchMetrics();
        }
      )
      .subscribe((status) => {
        console.log(`[NETWORK_TELEMETRY] SOCKET_STATUS: Oracle socket state -> ${status}`);
      });

    return () => {
      console.log("[NETWORK_TELEMETRY] SOCKET_CLOSE: Tearing down connection.");
      supabase.removeChannel(ch);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="rounded-3xl border-teal-50 dark:bg-card dark:border-teal-900/40 shadow-sm overflow-hidden min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-teal-50 dark:bg-card dark:border-teal-900/40 shadow-sm overflow-hidden transition-all">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-teal-50/50 dark:border-teal-900/40 pb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-800 dark:text-teal-200 flex items-center gap-2">
            <Zap size={14} className="text-teal-600 dark:text-teal-300" />
            Oracle Telemetry · Global Hub Egress
          </h3>
          <button 
            onClick={() => fetchMetrics(true)}
            className="text-teal-600 hover:text-teal-800 transition-colors"
          >
            <RefreshCw size={12} className={cn(isRefreshing && "animate-spin")} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 opacity-40 space-y-2">
            <Activity className="w-8 h-8 text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Awaiting Oracle Handshake</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-colors",
                  m.status === "meeting"
                    ? "bg-teal-50/30 dark:bg-teal-950/20 border-teal-50 dark:border-teal-900/40"
                    : m.status === "warning"
                      ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40"
                      : "bg-red-50/30 dark:bg-red-950/20 border-red-100 dark:border-red-900/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-3 h-3">
                    <span className={cn("absolute w-2 h-2 rounded-full", dotColor(m.status))} />
                  </div>
                  <div className="space-y-0.5">
                    <span className={cn("text-xs font-bold block", textColor(m.status))}>{m.sla_name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">
                      Status: {statusLabel(m.status)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black tracking-tighter text-slate-700 dark:text-foreground">
                    {m.current_value?.toFixed(1) ?? "—"}
                    <span className="text-[10px] text-slate-400 dark:text-muted-foreground font-medium tracking-normal">
                      {" "}ms / SLA: {m.target_value ?? "—"}
                    </span>
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                    Live Oracle Feed
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MSAComplianceCard;