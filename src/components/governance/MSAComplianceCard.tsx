import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Zap, RefreshCw } from "lucide-react";
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

// Per-endpoint SLA budget (ms). Anything not listed defaults to 250 ms.
const SLA_BUDGET_MS: Record<string, number> = {
  default: 250,
};

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
  const debounceRef = useRef<number | null>(null);

  const fetchMetrics = async (showToast: boolean = false) => {
    if (showToast) setIsRefreshing(true);
    console.log("[GLOBAL_ORACLE_METRICS] START: Aggregating 24h execution-worker latency telemetry.");
    try {
      const { data, error } = await supabase
        .from("api_metrics" as any)
        .select("endpoint, latency_ms, status_code, timestamp")
        .gte("timestamp", new Date(Date.now() - 86400_000).toISOString())
        .limit(1000);

      if (error) throw error;

      const agg: Record<string, { sum: number; n: number; err: boolean }> = {};
      ((data as any[]) || []).forEach((row) => {
        const ep = row.endpoint || "unknown";
        if (!agg[ep]) agg[ep] = { sum: 0, n: 0, err: false };
        agg[ep].sum += Number(row.latency_ms ?? 0);
        agg[ep].n += 1;
        if (Number(row.status_code ?? 0) >= 500) agg[ep].err = true;
      });

      const rows: MSA[] = Object.entries(agg).map(([endpoint, v]) => {
        const avg = v.n ? v.sum / v.n : 0;
        const target = SLA_BUDGET_MS[endpoint] ?? SLA_BUDGET_MS.default;
        let status: MSA["status"] = "meeting";
        if (v.err || avg > target * 1.5) status = "breach";
        else if (avg > target) status = "warning";
        return {
          id: endpoint,
          sla_name: endpoint,
          target_value: target,
          current_value: avg,
          status,
        };
      });
      rows.sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0));

      console.log(`[GLOBAL_ORACLE_METRICS] SUCCESS: Aggregated ${rows.length} endpoints from ${((data as any[]) || []).length} samples.`);
      setItems(rows);
    } catch (err: any) {
      console.log("[GLOBAL_ORACLE_METRICS] CRITICAL_FAILURE: Global telemetry bridge stalled. Reason: " + err.message);
      if (showToast) {
        toast({
          title: "Telemetry Sync Failed",
          description: "Could not retrieve live execution-worker telemetry.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    console.log("[GLOBAL_ORACLE_METRICS] SOCKET_START: Listening for aggregate execution-worker telemetry.");
    const ch = supabase
      .channel("global_api_metrics_telemetry")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "api_metrics" },
        () => {
          console.log("[GLOBAL_ORACLE_METRICS] SOCKET_EVENT: New worker sample arrived. Debounced re-aggregation queued.");
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => fetchMetrics(), 2000);
        },
      )
      .subscribe((status) => {
        console.log(`[GLOBAL_ORACLE_METRICS] SOCKET_STATUS: Worker socket state -> ${status}`);
      });

    return () => {
      console.log("[GLOBAL_ORACLE_METRICS] SOCKET_CLOSE: Tearing down execution-worker listener.");
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
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
            Oracle Telemetry · Global Worker Latency
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Worker Samples in 24h Window</p>
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
                    <span className={cn("text-xs font-bold block truncate max-w-[180px]", textColor(m.status))}>{m.sla_name}</span>
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
                    Live Worker Feed
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
