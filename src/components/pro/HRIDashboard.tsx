import { useState, useEffect } from "react";
import { Gauge, TrendingUp, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BioTetherLink from "./BioTetherLink";

const HRIDashboard = () => {
  const [hriScore, setHriScore] = useState<number>(72);
  const [metrics, setMetrics] = useState([
    { icon: TrendingUp, label: "Focus Index", value: "84%", trend: "Live" },
    { icon: Clock, label: "Recovery Time", value: "4.2h", trend: "Nominal" },
    { icon: Zap, label: "Peak Hours", value: "9AM-1PM", trend: "Stable" },
    { icon: Gauge, label: "Gig Score", value: "91/100", trend: "Analyzed" },
  ]);

  useEffect(() => {
    const initLiveSynapse = async () => {
      // 1. Fetch initial state (No Gating - fetches latest global packet if not logged in)
      const { data: score } = await (supabase
        .from("hri_scores" as any)
        .select("total_score, is_ghost_protocol")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (score) setHriScore(Number(score.total_score));

      // 2. Establish Real-time Handshake (REQ-SYN-4.2.1)
      const channel = supabase
        .channel("hri_synapse_ungated")
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "hri_scores" }, (payload: any) => {
          console.log("IDIA Synapse Packet:", payload);
          if (payload.new && payload.new.total_score) {
            setHriScore(Number(payload.new.total_score));
            if (payload.new.total_score < 30) {
              toast({ title: "⚠️ Low Cognitive Battery", variant: "destructive" });
            }
          }
        })
        .subscribe((status) => {
          console.log("Synapse Status:", status);
        });

      return channel;
    };

    const synapseChannel = initLiveSynapse();

    return () => {
      synapseChannel.then((ch) => {
        if (ch) supabase.removeChannel(ch);
      });
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "hsl(142, 71%, 45%)";
    if (score >= 40) return "hsl(28, 80%, 55%)";
    return "hsl(0, 84%, 60%)";
  };

  const strokeDashoffset = 2 * Math.PI * 54 - (hriScore / 100) * (2 * Math.PI * 54);

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] flex items-center justify-center">
          <Gauge className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Workforce Optimization</h2>
          <p className="text-[10px] text-muted-foreground">IDIA Life Pro — Ungated Live Feed</p>
        </div>
      </div>

      <BioTetherLink />

      <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-6 flex flex-col items-center">
        <p className="text-xs text-muted-foreground mb-4">Human Reliability Index</p>
        <div className="relative w-32 h-32">
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
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{hriScore}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="text-xs mt-3 font-medium" style={{ color: getScoreColor(hriScore) }}>
          {hriScore >= 70 ? "Optimal Performance" : hriScore >= 40 ? "Moderate" : "Low Battery"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-white/20 bg-card/60 backdrop-blur-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <m.icon className="w-3.5 h-3.5 text-[hsl(178,42%,32%)]" />
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{m.value}</p>
            <p className="text-[10px] text-[hsl(178,42%,32%)]">{m.trend}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRIDashboard;
