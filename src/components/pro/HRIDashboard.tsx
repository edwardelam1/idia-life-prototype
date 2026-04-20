import { useState, useEffect } from "react";
import { Gauge, TrendingUp, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BioTetherLink from "./BioTetherLink";

interface HRIDashboardProps {
  isMasked?: boolean;
}

const HRIDashboard = ({ isMasked = false }: HRIDashboardProps) => {
  const [hriScore, setHriScore] = useState(72);
  const [metrics, setMetrics] = useState({
    focus: 0,
    recovery: 0,
    peak: "Analyzing...",
    gig: 0,
  });

  useEffect(() => {
    if (isMasked) return;

    const streamTelemetry = async () => {
      const { data: staged } = await (supabase
        .from("staged_health_data" as any)
        .select("data_quality_score, effort_score")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      const { data: daily } = await (supabase
        .from("staged_health_data_daily" as any)
        .select("total_sleep_minutes")
        .order("sync_date", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      setMetrics({
        focus: Math.round((staged?.data_quality_score || 0.84) * 100),
        recovery: Number(((daily?.total_sleep_minutes || 252) / 60).toFixed(1)),
        peak: "9AM-1PM",
        gig: Math.round(staged?.effort_score || 91),
      });
    };

    streamTelemetry();

    const channel = supabase
      .channel("pro_live")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "hri_scores" }, (payload) =>
        setHriScore(Number(payload.new.total_score)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMasked]);

  const metricCards = [
    { icon: TrendingUp, label: "Focus Index", value: isMasked ? "--%" : `${metrics.focus}%` },
    { icon: Clock, label: "Recovery Time", value: isMasked ? "--h" : `${metrics.recovery}h` },
    { icon: Zap, label: "Peak Hours", value: isMasked ? "—" : metrics.peak },
    { icon: Gauge, label: "Gig Score", value: isMasked ? "--/100" : `${metrics.gig}/100` },
  ];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-sm">Workforce Optimization</h2>
        <span className="text-[10px] bg-[hsl(178,42%,32%)] text-white px-2 py-0.5 rounded-full">LIVE</span>
      </div>

      <BioTetherLink />

      {/* HRI Gauge - Blurred if masked */}
      <div
        className={`rounded-2xl border bg-card/60 p-6 flex flex-col items-center transition-all ${isMasked ? "blur-[2px] opacity-60" : ""}`}
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
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 - (hriScore / 100) * (2 * Math.PI * 54)}
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
        {metricCards.map((m) => (
          <div key={m.label} className="rounded-xl border bg-card/60 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3.5 h-3.5 text-[hsl(178,42%,32%)]" />
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-sm font-semibold">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRIDashboard;
