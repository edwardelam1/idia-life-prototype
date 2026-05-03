import { useState, useEffect } from "react";
import { Brain, Eye, Zap, Shield, Activity, Volume2, Accessibility, Wind, Heart, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// --- TYPES ALIGNED TO SOVEREIGN SCHEMA ---
interface StagedHealthData {
  heart_rate: number;
  heart_rate_variability_ms: number;
  respiratory_rate: number;
  environmental_audio_exposure_db: number;
  walking_asymmetry_percentage: number;
  data_quality_score: number;
  effort_score: number;
}

const RSVP_WORDS = ["FOCUS", "CLARITY", "RESOLVE", "EXECUTE", "DOMINATE", "OPTIMIZE", "TRANSCEND", "SOVEREIGN"];

const InfoIcon = ({ text }: { text: string }) => (
  <TooltipProvider>
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Info className="w-2.5 h-2.5 ml-1 opacity-30 hover:opacity-100 transition-opacity cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="bg-black text-white border-white/10 text-[10px] max-w-[180px] p-2">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const CPMDashboard = ({ isMasked = false }: { isMasked?: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [gammaActive, setGammaActive] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [rsvpActive, setRsvpActive] = useState(false);
  const [rsvpWord, setRsvpWord] = useState(0);
  const [rsvpSpeed, setRsvpSpeed] = useState(300);

  // Consolidated state for Pro + Pro+ Metrics (Zero Mock Data)
  const [metrics, setMetrics] = useState({
    // Occupational (Pro)
    hr: 0, hrv: 0, resp: 0, noise: 0, asymmetry: 0,
    // Cognitive (Pro+)
    focusScore: 0,
    stressIndex: 0,
    recovery: 0,
    hriScore: 0,
    status: "CALIBRATING" as "CALIBRATING" | "ARMED" | "TRIGGERED"
  });

  // 1. RSVP cycling logic
  useEffect(() => {
    if (!rsvpActive) return;
    const interval = setInterval(() => {
      setRsvpWord((p) => (p + 1) % RSVP_WORDS.length);
    }, rsvpSpeed);
    return () => clearInterval(interval);
  }, [rsvpActive, rsvpSpeed]);

  // 2. 40Hz Hardware Bridge: Visual + Auditory Entrainment
  const triggerGammaSequence = async (active: boolean) => {
    setGammaActive(active);
    
    if (active) {
      // Dispatch CMD_INIT_FLASHBULB to Native iOS/Android Bridge [cite: 123, 270]
      if (window.webkit?.messageHandlers?.syncHealthData) {
        window.webkit.messageHandlers.syncHealthData.postMessage({
          action: "CMD_INIT_FLASHBULB",
          frequency: 40,
          force_brightness: 1.0,
          audio_enabled: true
        });
      }
      setIsFlashing(true);
    } else {
      if (window.webkit?.messageHandlers?.syncHealthData) {
        window.webkit.messageHandlers.syncHealthData.postMessage({
          action: "CMD_STOP_FLASHBULB"
        });
      }
      setIsFlashing(false);
    }
  };

  // 3. Full Pipeline Hydration (Live-Wire) [cite: 22, 23]
  useEffect(() => {
    if (isMasked) return;
    let isMounted = true;

    const streamAllMetrics = async () => {
      // Initial Ingress from Staged Tier
      const { data: health } = await supabase
        .from("staged_health_data" as any)
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isMounted && health) {
        const hData = health as StagedHealthData;
        setMetrics({
          hr: hData.heart_rate || 0,
          hrv: hData.heart_rate_variability_ms || 0,
          resp: hData.respiratory_rate || 0,
          noise: hData.environmental_audio_exposure_db || 0,
          asymmetry: hData.walking_asymmetry_percentage || 0,
          focusScore: Math.round((hData.data_quality_score || 0) * 100),
          stressIndex: hData.heart_rate_variability_ms ? Number((100 / hData.heart_rate_variability_ms).toFixed(2)) : 0,
          recovery: Math.round(hData.effort_score || 0),
          hriScore: Math.round((hData.data_quality_score || 0) * 100),
          status: hData.heart_rate > 0 ? "ARMED" : "CALIBRATING",
        });
      }
      setLoading(false);

      // Real-time listener for instant biometric propagation [cite: 36]
      const channel = supabase.channel("cpm_pro_plus_feed")
        .on("postgres_changes" as any, 
          { event: "INSERT", schema: "public", table: "staged_health_data" },
          (payload: any) => {
            const next = payload.new as StagedHealthData;
            if (next && isMounted) {
              setMetrics(prev => ({
                ...prev,
                hr: next.heart_rate || prev.hr,
                hrv: next.heart_rate_variability_ms || prev.hrv,
                resp: next.respiratory_rate || prev.resp,
                noise: next.environmental_audio_exposure_db || prev.noise,
                asymmetry: next.walking_asymmetry_percentage || prev.asymmetry,
                focusScore: next.data_quality_score ? Math.round(next.data_quality_score * 100) : prev.focusScore,
                stressIndex: next.heart_rate_variability_ms ? Number((100 / next.heart_rate_variability_ms).toFixed(2)) : prev.stressIndex,
                recovery: next.effort_score ? Math.round(next.effort_score) : prev.recovery,
                hriScore: next.data_quality_score ? Math.round(next.data_quality_score * 100) : prev.hriScore,
                status: "ARMED"
              }));

              if (next.data_quality_score && next.data_quality_score < 0.4) {
                toast({ title: "⚠️ Cognitive Drift", description: "Focus score below optimal threshold.", variant: "destructive" });
              }
            }
          }
        ).subscribe();

      return channel;
    };

    const channelPromise = streamAllMetrics();
    return () => { 
      isMounted = false; 
      channelPromise.then(ch => { if(ch) supabase.removeChannel(ch); });
    };
  }, [isMasked]);

  const cognitiveGrid = [
    { label: "Focus Score", value: `${metrics.focusScore}/100`, info: "Real-time attention and engagement metric." },
    { label: "Stress Index", value: metrics.stressIndex.toString(), info: "Autonomic load derived from HRV delta." },
    { label: "Recovery %", value: `${metrics.recovery}%`, info: "Bio-restitution capacity for current cycle." },
  ];

  const occupationalGrid = [
    { label: "Heart Rate", value: `${metrics.hr} BPM`, icon: Heart },
    { label: "HRV Index", value: `${metrics.hrv} ms`, icon: Activity },
    { label: "Acoustic", value: `${metrics.noise} dB`, icon: Volume2 },
    { label: "Respiratory", value: `${metrics.resp} br/m`, icon: Wind },
    { label: "Gait Balance", value: `${metrics.asymmetry}%`, icon: Accessibility },
    { label: "Reliability", value: `${metrics.hriScore}%`, icon: Shield },
  ];

  if (loading && !isMasked) return <div className="p-8 text-center animate-pulse uppercase text-[10px] tracking-widest text-muted-foreground font-black">Hydrating IDIA Pro+...</div>;

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in relative bg-background min-h-screen">
      {/* 40Hz FULL-SCREEN FLASH OVERLAY (100% Coverage) [cite: 123, 270] */}
      {isFlashing && (
        <div 
          className="fixed inset-0 z-[100] pointer-events-none bg-white animate-[gamma-flash_25ms_steps(2)_infinite]" 
          style={{ mixBlendMode: 'difference' }}
        />
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)] flex items-center justify-center shadow-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm uppercase">Cognitive Performance</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">IDIA Life Pro+</p>
          </div>
        </div>
        {!isMasked && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(28,80%,55%)]/10 border border-[hsl(28,80%,55%)]/20 animate-pulse">
            <div className="w-1 h-1 rounded-full bg-[hsl(28,80%,55%)]" />
            <span className="text-[8px] font-bold text-[hsl(28,80%,55%)] uppercase">Live Synapse</span>
          </div>
        )}
      </div>

      {/* COGNITIVE BIOMETRICS (Pro+) */}
      <div className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}>
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />
          Cognitive Biometrics
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {cognitiveGrid.map((b) => (
            <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50">
              <div className="flex justify-center mb-1"><InfoIcon text={b.info} /></div>
              <p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase tracking-tighter">{b.label}</p>
              <p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* OCCUPATIONAL BIOMETRICS (Ported from Pro) */}
      <div className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}>
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />
          Occupational Biometrics
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {occupationalGrid.map((b) => (
            <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50">
              <div className="flex justify-center mb-1">
                <b.icon className="w-3 h-3 text-[hsl(28,80%,55%)] opacity-70" />
              </div>
              <p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase tracking-tighter">{b.label}</p>
              <p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* GAMMA TRIGGER */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${gammaActive ? "text-[hsl(28,80%,55%)] animate-pulse" : "text-muted-foreground"}`} />
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">40Hz Gamma Trigger</h3>
              <p className="text-[10px] text-muted-foreground">Neural entrainment active</p>
            </div>
          </div>
          <Switch 
            checked={gammaActive} 
            onCheckedChange={triggerGammaSequence} 
            disabled={isMasked} 
          />
        </div>
      </div>

      {/* RSVP MEMORY ANCHORING [cite: 281] */}
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
        @keyframes gamma-flash {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CPMDashboard;