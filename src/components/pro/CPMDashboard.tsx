import { useState, useEffect } from "react";
import { Brain, Eye, Zap, Shield, Activity, Volume2, Accessibility, Wind, Heart, Info, CheckCircle2, RotateCcw, Target } from "lucide-react";
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

const RSVP_WORDS = ["FOCUS", "CLARITY", "RESOLVE", "EXECUTE", "DOMINATE", "OPTIMIZE", "TRANSCEND", "SOVEREIGN", "VELOCITY", "BASELINE", "INTEGRITY", "ALPHA"];

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
  
  // --- HIGH-FIDELITY RSVP ENGINE ---
  const [rsvpPhase, setRsvpPhase] = useState<'IDLE' | 'CALIBRATING' | 'PRESENTING' | 'RECALL' | 'RESULT'>('IDLE');
  const [rsvpWordIndex, setRsvpWordIndex] = useState(0);
  const [rsvpSpeed, setRsvpSpeed] = useState(300);
  const [activeSequence, setActiveSequence] = useState<string[]>([]);
  const [userRecall, setUserInput] = useState<string[]>([]);
  const [clutchScore, setClutchScore] = useState<number | null>(null);

  const [metrics, setMetrics] = useState({
    hr: 0, hrv: 0, resp: 0, noise: 0, asymmetry: 0,
    focusScore: 0, stressIndex: 0, recovery: 0, hriScore: 0,
    status: "CALIBRATING" as "CALIBRATING" | "ARMED" | "TRIGGERED"
  });

  // 1. ROBUST RSVP LOGIC (Phase-Controlled Transition)
  useEffect(() => {
    if (rsvpPhase !== 'PRESENTING') return;

    const interval = setInterval(() => {
      setRsvpWordIndex((prev) => {
        if (prev >= activeSequence.length - 1) {
          clearInterval(interval);
          setTimeout(() => setRsvpPhase('RECALL'), 400);
          return prev;
        }
        return prev + 1;
      });
    }, rsvpSpeed);

    return () => clearInterval(interval);
  }, [rsvpPhase, rsvpSpeed, activeSequence]);

  const startRSVPSession = () => {
    const sequence = [...RSVP_WORDS].sort(() => 0.5 - Math.random()).slice(0, 5);
    setActiveSequence(sequence);
    setUserInput([]);
    setRsvpWordIndex(0);
    setClutchScore(null);
    setRsvpPhase('CALIBRATING');
    
    // 1-second visual "Lock-In" before firing firehose
    setTimeout(() => setRsvpPhase('PRESENTING'), 1200);
  };

  const handleRecallSelection = (word: string) => {
    if (userRecall.includes(word)) return;
    const newRecall = [...userRecall, word];
    setUserInput(newRecall);
    
    if (newRecall.length === activeSequence.length) {
      const correct = newRecall.filter((w, i) => w === activeSequence[i]).length;
      const accuracy = correct / activeSequence.length;
      const speedFactor = 1000 / rsvpSpeed;
      const score = Math.round((accuracy * 100) * speedFactor);
      
      setClutchScore(score);
      setRsvpPhase('RESULT');
      if (score > 150) toast({ title: "⚡ PEAK NEURAL DRIVE", description: "Clutch Score exceeds operational baseline." });
    }
  };

  // 2. 40Hz Hardware Bridge (Intact)
  const triggerGammaSequence = async (active: boolean) => {
    setGammaActive(active);
    if (active) {
      if (window.webkit?.messageHandlers?.syncHealthData) {
        window.webkit.messageHandlers.syncHealthData.postMessage({
          action: "CMD_INIT_FLASHBULB", frequency: 40, force_brightness: 1.0, audio_enabled: true
        });
      }
      setIsFlashing(true);
    } else {
      if (window.webkit?.messageHandlers?.syncHealthData) {
        window.webkit.messageHandlers.syncHealthData.postMessage({ action: "CMD_STOP_FLASHBULB" });
      }
      setIsFlashing(false);
    }
  };

  // 3. Full Pipeline Hydration (Live-Wire)
  useEffect(() => {
    if (isMasked) return;
    let isMounted = true;
    const streamAllMetrics = async () => {
      const { data: health } = await supabase.from("staged_health_data" as any).select("*").order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      if (isMounted && health) {
        const hData = health as StagedHealthData;
        setMetrics({
          hr: hData.heart_rate || 0, hrv: hData.heart_rate_variability_ms || 0,
          resp: hData.respiratory_rate || 0, noise: hData.environmental_audio_exposure_db || 0,
          asymmetry: hData.walking_asymmetry_percentage || 0,
          focusScore: Math.round((hData.data_quality_score || 0) * 100),
          stressIndex: hData.heart_rate_variability_ms ? Number((100 / hData.heart_rate_variability_ms).toFixed(2)) : 0,
          recovery: Math.round(hData.effort_score || 0),
          hriScore: Math.round((hData.data_quality_score || 0) * 100),
          status: hData.heart_rate > 0 ? "ARMED" : "CALIBRATING",
        });
      }
      setLoading(false);
      const channel = supabase.channel("cpm_pro_plus_feed").on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "staged_health_data" }, (payload: any) => {
        const next = payload.new as StagedHealthData;
        if (next && isMounted) {
          setMetrics(prev => ({
            ...prev,
            hr: next.heart_rate || prev.hr, hrv: next.heart_rate_variability_ms || prev.hrv,
            resp: next.respiratory_rate || prev.resp, noise: next.environmental_audio_exposure_db || prev.noise,
            asymmetry: next.walking_asymmetry_percentage || prev.asymmetry,
            focusScore: next.data_quality_score ? Math.round(next.data_quality_score * 100) : prev.focusScore,
            stressIndex: next.heart_rate_variability_ms ? Number((100 / next.heart_rate_variability_ms).toFixed(2)) : prev.stressIndex,
            recovery: next.effort_score ? Math.round(next.effort_score) : prev.recovery,
            hriScore: next.data_quality_score ? Math.round(next.data_quality_score * 100) : prev.hriScore,
            status: "ARMED"
          }));
        }
      }).subscribe();
      return channel;
    };
    const channelPromise = streamAllMetrics();
    return () => { isMounted = false; channelPromise.then(ch => { if(ch) supabase.removeChannel(ch); }); };
  }, [isMasked]);

  if (loading && !isMasked) return <div className="p-8 text-center animate-pulse uppercase text-[10px] tracking-widest text-muted-foreground font-black">Hydrating IDIA Pro+...</div>;

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in relative bg-background min-h-screen">
      {isFlashing && <div className="fixed inset-0 z-[100] pointer-events-none bg-white animate-[gamma-flash_25ms_steps(2)_infinite]" style={{ mixBlendMode: 'difference' }} />}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)] flex items-center justify-center shadow-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div><h2 className="font-semibold text-foreground text-sm uppercase">Cognitive Performance</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">IDIA Life Pro+</p></div>
        </div>
        {!isMasked && <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(28,80%,55%)]/10 border border-[hsl(28,80%,55%)]/20 animate-pulse"><div className="w-1 h-1 rounded-full bg-[hsl(28,80%,55%)]" /><span className="text-[8px] font-bold text-[hsl(28,80%,55%)] uppercase">Live Synapse</span></div>}
      </div>

      {/* BIOMETRIC GRIDS */}
      <div className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}>
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider"><Eye className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />Cognitive Biometrics</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Focus Score", value: `${metrics.focusScore}/100`, info: "Attention metric." },
            { label: "Stress Index", value: metrics.stressIndex.toString(), info: "Autonomic load." },
            { label: "Recovery %", value: `${metrics.recovery}%`, info: "Bio-restitution." },
          ].map((b) => (
            <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50"><div className="flex justify-center mb-1"><InfoIcon text={b.info} /></div><p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase tracking-tighter">{b.label}</p><p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p></div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}>
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider"><Activity className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />Occupational Biometrics</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Heart Rate", value: `${metrics.hr} BPM`, icon: Heart },
            { label: "HRV Index", value: `${metrics.hrv} ms`, icon: Activity },
            { label: "Acoustic", value: `${metrics.noise} dB`, icon: Volume2 },
            { label: "Respiratory", value: `${metrics.resp} br/m`, icon: Wind },
            { label: "Gait Balance", value: `${metrics.asymmetry}%`, icon: Accessibility },
            { label: "Reliability", value: `${metrics.hriScore}%`, icon: Shield },
          ].map((b) => (
            <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50"><div className="flex justify-center mb-1"><b.icon className="w-3 h-3 text-[hsl(28,80%,55%)] opacity-70" /></div><p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase tracking-tighter">{b.label}</p><p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p></div>
          ))}
        </div>
      </div>

      {/* GAMMA TRIGGER */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Zap className={`w-4 h-4 ${gammaActive ? "text-[hsl(28,80%,55%)] animate-pulse" : "text-muted-foreground"}`} /><div><h3 className="text-xs font-bold text-foreground uppercase tracking-wider">40Hz Gamma Trigger</h3><p className="text-[10px] text-muted-foreground">Neural entrainment active</p></div></div>
          <Switch checked={gammaActive} onCheckedChange={triggerGammaSequence} disabled={isMasked} />
        </div>
      </div>

      {/* ROBUST MEMORY ANCHORING RSVP */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[hsl(28,80%,55%)]" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Memory Anchoring RSVP</h3>
          </div>
          <Button
            size="sm"
            variant={rsvpPhase !== 'IDLE' ? "destructive" : "default"}
            className={`text-[10px] font-bold uppercase h-7 ${rsvpPhase === 'IDLE' ? "bg-[hsl(28,80%,55%)]" : ""}`}
            onClick={() => rsvpPhase === 'IDLE' ? startRSVPSession() : setRsvpPhase('IDLE')}
            disabled={isMasked}
          >
            {rsvpPhase === 'IDLE' ? "Start Validation" : "Reset"}
          </Button>
        </div>

        <div className="min-h-[220px] bg-slate-50/50 rounded-xl flex flex-col items-center justify-center p-4 relative">
          {rsvpPhase === 'CALIBRATING' && (
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <Target className="w-8 h-8 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Lock Focus</p>
            </div>
          )}

          {rsvpPhase === 'PRESENTING' && (
            <div className="text-5xl font-black text-foreground tracking-[0.25em] animate-in zoom-in duration-75">
              {activeSequence[rsvpWordIndex]}
            </div>
          )}

          {rsvpPhase === 'RECALL' && (
            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Validation Hand-off</p>
                <p className="text-[9px] text-slate-500 italic">Select sequence in seen order</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...activeSequence].sort().map((word) => (
                  <Button 
                    key={word} 
                    variant="outline" 
                    className={`text-[9px] font-black uppercase h-10 border-2 transition-all ${userRecall.includes(word) ? 'bg-slate-900 text-white border-slate-900 scale-95' : 'hover:border-slate-900'}`}
                    onClick={() => handleRecallSelection(word)}
                  >
                    {word}
                  </Button>
                ))}
              </div>
              <div className="flex justify-center gap-1.5">
                {activeSequence.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < userRecall.length ? 'bg-[hsl(28,80%,55%)]' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
          )}

          {rsvpPhase === 'RESULT' && (
            <div className="text-center space-y-3 animate-in zoom-in duration-300">
              <Badge className="bg-emerald-500 text-white border-none uppercase text-[8px] font-black px-3 py-1">Identity Verified</Badge>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Clutch Score established</div>
              <div className="text-6xl font-black italic tracking-tighter text-[hsl(28,80%,55%)] drop-shadow-sm">{clutchScore}</div>
              <p className="text-[10px] font-bold text-slate-600 max-w-[220px] mx-auto leading-tight uppercase">
                Working memory baseline anchor identified at {rsvpSpeed}ms intervals.
              </p>
              <Button size="sm" variant="ghost" className="mt-4 text-[9px] font-black uppercase flex items-center gap-2 hover:bg-slate-100" onClick={startRSVPSession}>
                <RotateCcw className="w-3.5 h-3.5" /> Re-Anchor Session 
              </Button>
            </div>
          )}

          {rsvpPhase === 'IDLE' && (
            <div className="flex flex-col items-center gap-6 animate-in fade-in">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                <Target className="w-5 h-5 text-slate-300" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Cognitive Calibration</p>
                <p className="text-[9px] text-slate-500 max-w-[180px] leading-tight">Verifies working memory latency before high-risk operations.</p>
              </div>
              <div className="flex items-center gap-2">
                {[500, 300, 150].map((s) => (
                  <button key={s} className={`text-[9px] font-black px-4 py-1.5 rounded-lg uppercase transition-all border-2 ${rsvpSpeed === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"}`} onClick={() => setRsvpSpeed(s)}>
                    {s === 500 ? "Slow" : s === 300 ? "Norm" : "Alpha"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gamma-flash { 0% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default CPMDashboard;