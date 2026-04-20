import { useState, useEffect } from "react";
import { Gauge, TrendingUp, Clock, Zap, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BioTetherLink from "./BioTetherLink";

const HRIDashboard = () => {
  const [hriScore, setHriScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([
    { icon: TrendingUp, label: "Focus Index", value: "--%", trend: "..." },
    { icon: Clock, label: "Recovery Time", value: "--h", trend: "..." },
    { icon: Zap, label: "Peak Hours", value: "...", trend: "..." },
    { icon: Gauge, label: "Gig Score", value: "--/100", trend: "..." },
  ]);

  useEffect(() => {
    const fetchLiveHRI = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch latest HRI Score from the Bio-Oracle Ledger
      const { data: scoreData } = await supabase
        .from("hri_scores")
        .select("total_score, is_ghost_protocol")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (scoreData) {
        setHriScore(Number(scoreData.total_score));
        if (scoreData.is_ghost_protocol) {
          toast({
            title: "⚠️ GHOST PROTOCOL ACTIVE",
            description: "Acute Sympathetic Dump detected. Signing authority suspended.",
            variant: "destructive",
          });
        }
      }

      // 2. Fetch Performance Metrics from Staged Health Data
      const { data: performanceData } = await supabase
        .from("staged_health_data")
        .select("data_quality_score, effort_score, duration_seconds")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(5);

      if (performanceData && performanceData.length > 0) {
        const avgFocus =
          performanceData.reduce((acc, curr) => acc + (curr.data_quality_score || 0), 0) / performanceData.length;
        const avgEffort =
          performanceData.reduce((acc, curr) => acc + (curr.effort_score || 0), 0) / performanceData.length;

        setMetrics([
          { icon: TrendingUp, label: "Focus Index", value: `${Math.round(avgFocus * 100)}%`, trend: "Live" },
          { icon: Clock, label: "Recovery Time", value: "4.2h", trend: "Nominal" }, // To be tethered to sleep_efficiency logic
          { icon: Zap, label: "Peak Hours", value: "9AM-1PM", trend: "Stable" },
          { icon: Gauge, label: "Gig Score", value: `${Math.round(avgEffort)}/100`, trend: "Weighted" },
        ]);
      }
      setLoading(false);
    };

    fetchLiveHRI();

    // 3. Establish Real-time Subscription for Sub-100ms Updates (REQ-SYN-4.2.1)
    const channel = supabase
      .channel("hri_live_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hri_scores",
        },
        (payload) => {
          setHriScore(Number(payload.new.total_score));
          if (payload.new.total_score < 30) {
            toast({
              title: "⚠️ Low Cognitive Battery",
              description: `HRI at ${payload.new.total_score}%. Recovery Needed.`,
              variant: "destructive",
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "hsl(142, 71%, 45%)";
    if (score >= 40) return "hsl(28, 80%, 55%)";
    return "hsl(0, 84%, 60%)";
  };

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (hriScore / 100) * circumference;

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] flex items-center justify-center">
          <Gauge className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Workforce Optimization</h2>
          <p className="text-[10px] text-muted-foreground">IDIA Life Pro — Live Synapse</p>
        </div>
      </div>

      <BioTetherLink />

      {/* HRI Gauge */}
      <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-6 flex flex-col items-center">
        <p className="text-xs text-muted-foreground mb-4">Human Reliability Index</p>
        <div className="relative w-32 h-32">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
          ) : (
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={getScoreColor(hriScore)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{hriScore}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="text-xs mt-3 font-medium" style={{ color: getScoreColor(hriScore) }}>
          {hriScore >= 70
            ? "Optimal Performance"
            : hriScore >= 40
              ? "Moderate — Rest Recommended"
              : "Low Battery — Recovery Needed"}
        </p>
      </div>

      {/* Gig Performance Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-white/20 bg-card/60 backdrop-blur-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-[hsl(178,42%,32%)]" />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{m.value}</p>
              <p className="text-[10px] text-[hsl(178,42%,32%)]">{m.trend}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HRIDashboard;
