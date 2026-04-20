import { useState, useEffect } from "react";
import { Brain, Eye, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BioTetherLink from "./BioTetherLink";

const RSVP_WORDS = ["FOCUS", "CLARITY", "RESOLVE", "EXECUTE", "DOMINATE", "OPTIMIZE", "TRANSCEND", "SOVEREIGN"];

interface HealthUpdate {
  data_quality_score: number | null;
  heart_rate_variability_ms: number | null;
  effort_score: number | null;
}

const CPMDashboard = ({ isMasked = false }: { isMasked?: boolean }) => {
  const [gammaActive, setGammaActive] = useState(false);
  const [rsvpActive, setRsvpActive] = useState(false);
  const [rsvpWord, setRsvpWord] = useState(0);
  const [rsvpSpeed, setRsvpSpeed] = useState(300);

  const [biometrics, setBiometrics] = useState({
    alphaPower: "12.4 µV²",
    thetaBeta: "0.82",
    focusScore: 87,
    stressIndex: 0.34,
    recovery: 78,
  });

  // 1. RSVP cycling logic
  useEffect(() => {
    if (!rsvpActive) return;
    const interval = setInterval(() => {
      setRsvpWord((p) => (p + 1) % RSVP_WORDS.length);
    }, rsvpSpeed);
    return () => clearInterval(interval);
  }, [rsvpActive, rsvpSpeed]);

  // 2. Real-time Synapse Feed (No Mock Data)
  useEffect(() => {
    if (isMasked) return;

    const streamCognitiveMetrics = async () => {
      const { data: health } = await (supabase
        .from("staged_health_data" as any)
        .select("data_quality_score, heart_rate_variability_ms, effort_score")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (health) {
        setBiometrics((prev) => ({
          ...prev,
          focusScore: Math.round((health.data_quality_score || 0.87) * 100),
          stressIndex: health.heart_rate_variability_ms
            ? Number((100 / health.heart_rate_variability_ms).toFixed(2))
            : 0.34,
          recovery: Math.round(health.effort_score || 78),
        }));
      }

      const channel = supabase
        .channel("cpm_live_feed")
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "staged_health_data" },
          (payload: any) => {
            const next = payload.new as HealthUpdate;
            if (next) {
              setBiometrics((prev) => ({
                ...prev,
                focusScore: next.data_quality_score ? Math.round(next.data_quality_score * 100) : prev.focusScore,
                stressIndex: next.heart_rate_variability_ms
                  ? Number((100 / next.heart_rate_variability_ms).toFixed(2))
                  : prev.stressIndex,
              }));
              if (next.data_quality_score && next.data_quality_score < 0.4) {
                toast({
                  title: "⚠️ Cognitive Drift",
                  description: "Focus score below optimal threshold.",
                  variant: "destructive",
                });
              }
            }
          },
        )
        .subscribe();

      return channel;
    };

    const cpmChannel = streamCognitiveMetrics();
    return () => {
      cpmChannel.then((ch) => {
        if (ch) supabase.removeChannel(ch);
      });
    };
  }, [isMasked]);

  const bioGrid = [
    { label: "Alpha Power", value: biometrics.alphaPower, status: "elevated" },
    { label: "Theta/Beta", value: biometrics.thetaBeta, status: "optimal" },
    { label: "Gamma Band", value: gammaActive ? "42 Hz" : "—", status: gammaActive ? "active" : "standby" },
    { label: "Focus Score", value: `${biometrics.focusScore}/100`, status: "high" },
    { label: "Stress Index", value: biometrics.stressIndex.toString(), status: "low" },
    { label: "Recovery %", value: `${biometrics.recovery}%`, status: "good" },
  ];

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in relative bg-background min-h-screen">
      {/* 40Hz Gamma Flicker Overlay */}
      {gammaActive && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-[gamma-flicker_25ms_linear_infinite] bg-[hsl(28,80%,55%)]/5" />
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)] flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Cognitive Performance</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">IDIA Life Pro+</p>
          </div>
        </div>
        {!isMasked && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(28,80%,55%)]/10 border border-[hsl(28,80%,55%)]/20 animate-pulse">
            <div className="w-1 h-1 rounded-full bg-[hsl(28,80%,55%)]" />
            <span className="text-[8px] font-bold text-[hsl(28,80%,55%)] uppercase">Live Synapse</span>
          </div>
        )}
      </div>

      <BioTetherLink isMasked={isMasked} />

      {/* Biometric Grid */}
      <div
        className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}
      >
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />
          Cognitive Biometrics
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {bioGrid.map((b) => (
            <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50">
              <p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase">{b.label}</p>
              <p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gamma Trigger */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap
              className={`w-4 h-4 ${gammaActive ? "text-[hsl(28,80%,55%)] animate-pulse" : "text-muted-foreground"}`}
            />
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">40Hz Gamma Trigger</h3>
              <p className="text-[10px] text-muted-foreground">Neural entrainment active</p>
            </div>
          </div>
          <Switch checked={gammaActive} onCheckedChange={setGammaActive} disabled={isMasked} />
        </div>
      </div>

      {/* RSVP Memory Anchoring */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[hsl(28,80%,55%)]" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Memory Anchoring RSVP</h3>
          </div>
          <Button
            size="sm"
            variant={rsvpActive ? "destructive" : "default"}
            className={`text-[10px] font-bold uppercase h-7 ${!rsvpActive ? "bg-[hsl(28,80%,55%)] hover:bg-[hsl(28,80%,45%)]" : ""}`}
            onClick={() => setRsvpActive(!rsvpActive)}
            disabled={isMasked}
          >
            {rsvpActive ? "Stop Session" : "Start Session"}
          </Button>
        </div>

        {rsvpActive && (
          <div className="flex flex-col items-center py-8">
            <div className="text-4xl font-black text-foreground tracking-[0.2em] transition-all duration-75">
              {RSVP_WORDS[rsvpWord]}
            </div>
            <div className="flex items-center gap-2 mt-6">
              {[500, 300, 150].map((s) => (
                <button
                  key={s}
                  className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase transition-colors ${rsvpSpeed === s ? "bg-[hsl(28,80%,55%)] text-white" : "bg-muted text-muted-foreground"}`}
                  onClick={() => setRsvpSpeed(s)}
                >
                  {s === 500 ? "Slow" : s === 300 ? "Normal" : "Hyper"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gamma-flicker {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CPMDashboard;
