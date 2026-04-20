import { useState, useEffect } from "react";
import { Gauge, TrendingUp, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BioTetherLink from "./BioTetherLink";

interface HRIUpdate {
  total_score: number;
  is_ghost_protocol: boolean;
}

const HRIDashboard = ({ isMasked = false }: { isMasked?: boolean }) => {
  const [hriScore, setHriScore] = useState<number>(72);
  const [metrics, setMetrics] = useState({
    focus: "--%",
    recovery: "--h",
    peak: "9AM-1PM",
    gig: "--/100",
  });

  useEffect(() => {
    if (isMasked) return;

    const streamSynapse = async () => {
      // 1. Initial State Fetch from Synapse Ledger
      const { data: score } = await (supabase
        .from("hri_scores" as any)
        .select("total_score")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      const { data: health } = await (supabase
        .from("staged_health_data" as any)
        .select("data_quality_score, effort_score")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (score) setHriScore(Number(score.total_score));
      if (health) {
        setMetrics((prev) => ({
          ...prev,
          focus: `${Math.round((health.data_quality_score || 0.84) * 100)}%`,
          gig: `${Math.round(health.effort_score || 91)}/100`,
        }));
      }

      // 2. Sub-100ms Live Feed
      const channel = supabase
        .channel("hri_realtime")
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "hri_scores" }, (payload: any) => {
          const next = payload.new as HRIUpdate;
          if (next && next.total_score) {
            setHriScore(Number(next.total_score));
            if (next.is_ghost_protocol) toast({ title: "⚠️ GHOST PROTOCOL", variant: "destructive" });
          }
        })
        .subscribe();

      return channel;
    };

    const synapseChannel = streamSynapse();
    return () => {
      synapseChannel.then((ch) => {
        if (ch) supabase.removeChannel(ch);
      });
    };
  }, [isMasked]);

  const circumference = 2 * Math.PI * 54;
  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] flex items-center justify-center">
            <Gauge className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Workforce Optimization</h2>
            <p className="text-[10px] text-muted-foreground">IDIA Life Pro — Ground Truth</p>
          </div>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
          <span className="text-[8px] font-bold text-emerald-500">LIVE SYNAPSE</span>
        </div>
      </div>

      <BioTetherLink isMasked={isMasked} />

      <div
        className={`rounded-2xl border p-6 flex flex-col items-center bg-card/60 backdrop-blur-xl ${isMasked ? "blur-sm opacity-50" : ""}`}
      >
        <p className="text-xs text-muted-foreground mb-4">Human Reliability Index</p>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(178,42%,42%)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (hriScore / 100) * circumference}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-bold">
            <span className="text-3xl">{isMasked ? "--" : hriScore}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: TrendingUp, label: "Focus Index", value: isMasked ? "--%" : metrics.focus },
          { icon: Clock, label: "Recovery Time", value: isMasked ? "--h" : "4.2h" },
          { icon: Zap, label: "Peak Hours", value: isMasked ? "—" : metrics.peak },
          { icon: Gauge, label: "Gig Score", value: isMasked ? "--/100" : metrics.gig },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border bg-card/60 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <m.icon className="w-3.5 h-3.5 text-[hsl(178,42%,32%)]" />
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-sm font-semibold">{isMasked ? "--" : m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRIDashboard;
