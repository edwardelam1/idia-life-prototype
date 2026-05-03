import { useState, useEffect } from "react";
import { Brain, Eye, Zap, Shield, Activity, Volume2, Accessibility, Wind, Heart, Info, CheckCircle2, RotateCcw, Target, Cpu, Activity as Pulse } from "lucide-react";
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
  
  // --- ROBUST RSVP ENGINE ---
  const [rsvpPhase, setRsvpPhase] = useState<'IDLE' | 'CALIBRATING' | 'PRESENTING' | 'MASK' | 'RECALL' | 'RESULT'>('IDLE');
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

  // 1. ROBUST RSVP LOGIC (Presentation with Inter-Stimulus Masking)
  useEffect(() => {
    if (rsvpPhase === 'PRESENTING') {
      const timer = setTimeout(() => {
        setRsvpPhase('MASK');
      }, rsvpSpeed);
      return () => clearTimeout(timer);
    }

    if (rsvpPhase === 'MASK') {
      const timer = setTimeout(() => {
        if (rsvpWordIndex >= activeSequence.length - 1) {
          setRsvpPhase('RECALL');
        } else {
          setRsvpWordIndex(prev => prev + 1);
          setRsvpPhase('PRESENTING');
        }
      }, 50); // High-frequency neural mask
      return () => clearTimeout(timer);
    }
  }, [rsvpPhase, rsvpSpeed, rsvpWordIndex, activeSequence]);

  const startRSVPSession = () => {
    const sequence = [...RSVP_WORDS].sort(() => 0.5 - Math.random()).slice(0, 5);
    setActiveSequence(sequence);
    setUserInput([]);
    setRsvpWordIndex(0);
    setClutchScore(null);
    setRsvpPhase('CALIBRATING');
    setTimeout(() => setRsvpPhase('PRESENTING'), 1000);
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
      if (score > 180) toast({ title: "⚡ ALPHA SYNC DETECTED", description: "Clutch Score exceeds operational baseline." });
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
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}>
          <h3 className="text-[9px] font-black text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-widest"><Eye className="w-3 h-3 text-[hsl(28,80%,55%)]" />Focus / Recovery</h3>
          <div className="space-y-3">
            {[
              { label: "Focus", value: `${metrics.focusScore}%` },
              { label: "Recovery", value: `${metrics.recovery}%` },
            ].map((b) => (
              <div key={b.label}><p className="text-[8px] font-black text-muted-foreground uppercase">{b.label}</p><p className="text-xl font-black text-foreground">{isMasked ? "—" : b.value}</p></div>
            ))}
          </div>
        </div>
        <div className={`rounded-2xl border border-border bg-white shadow-sm p-4 transition-all ${isMasked ? "blur-sm opacity-60" : ""}`}>
          <h3 className="text-[9px] font-black text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-widest"><Pulse className="w-3 h-3 text-[hsl(28,80%,55%)]" />Bio-State</h3>
          <div className="space-y-3">
            <div><p className="text-[8px] font-black text-muted-foreground uppercase">HRI Score</p><p className="text-xl font-black text-foreground">{isMasked ? "—" : metrics.hriScore}%</p></div>
            <div><p className="text-[8px] font-black text-muted-foreground uppercase">Autonomic</p><p className="text-xl font-black text-foreground">{isMasked ? "—" : metrics.hrv}ms</p></div>
          </div>
        </div>
      </div>

      {/* GAMMA TRIGGER */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Zap className={`w-5 h-5 ${gammaActive ? "text-[hsl(28,80%,55%)] animate-pulse" : "text-muted-foreground"}`} /><div><h3 className="text-xs font-black text-foreground uppercase tracking-wider">40Hz Gamma Trigger</h3><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Entrainment Status: {gammaActive ? "Active" : "Standby"}</p></div></div>
          <Switch checked={gammaActive} onCheckedChange={triggerGammaSequence} disabled={isMasked} />
        </div>
      </div>

      {/* INDUSTRIAL RSVP INSTRUMENT */}
      <div className="rounded-3xl border-2 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[hsl(28,80%,55%)]" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Memory Anchor V.2</h3>
          </div>
          <Button
            size="sm"
            className={`text-[9px] font-black uppercase h-7 px-4 ${rsvpPhase === 'IDLE' ? "bg-[hsl(28,80%,55%)] text-slate-900" : "bg-slate-800 text-white"}`}
            onClick={() => rsvpPhase === 'IDLE' ? startRSVPSession() : setRsvpPhase('IDLE')}
            disabled={isMasked}
          >
            {rsvpPhase === 'IDLE' ? "Initialize" : "Abort"}
          </Button>
        </div>

        <div className="min-h-[260px] bg-black flex flex-col items-center justify-center p-6 relative">
          {/* DIGITAL FRAME DECOR */}
          <div className="absolute inset-4 border border-slate-800 pointer-events-none opacity-50" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-600 uppercase tracking-[0.5em]">Neural-Interface-01</div>

          {rsvpPhase === 'CALIBRATING' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-[hsl(28,80%,55%)] border-t-transparent animate-spin" />
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[hsl(28,80%,55%)] animate-pulse">Locking Focus...</p>
            </div>
          )}

          {rsvpPhase === 'PRESENTING' && (
            <div className="text-6xl font-black text-white tracking-[0.15em] drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all transform scale-110">
              {activeSequence[rsvpWordIndex]}
            </div>
          )}

          {rsvpPhase === 'MASK' && (
            <div className="text-6xl font-black text-slate-800 tracking-[0.1em] opacity-40">
              #######
            </div>
          )}

          {rsvpPhase === 'RECALL' && (
            <div className="w-full space-y-6 z-10">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-[hsl(28,80%,55%)] uppercase tracking-[0.3em]">Validation Required</p>
                <p className="text-[8px] text-slate-500 uppercase font-bold">Input Sequence in Linear Order</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...activeSequence].sort().map((word) => (
                  <Button 
                    key={word} 
                    variant="outline" 
                    className={`text-[9px] font-black uppercase h-12 border-slate-700 bg-slate-900/50 text-slate-300 transition-all ${userRecall.includes(word) ? 'opacity-20 scale-90 border-slate-800' : 'hover:border-[hsl(28,80%,55%)] hover:text-white'}`}
                    onClick={() => handleRecallSelection(word)}
                  >
                    {word}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {rsvpPhase === 'RESULT' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500 uppercase">Principal Verified</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculated Clutch Score</p>
                <p className="text-7xl font-black italic text-white tracking-tighter drop-shadow-lg">{clutchScore}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-[10px] font-black text-slate-400 uppercase hover:text-white" onClick={startRSVPSession}>
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Re-Anchor Baseline 
              </Button>
            </div>
          )}

          {rsvpPhase === 'IDLE' && (
            <div className="flex flex-col items-center gap-8">
              <div className="grid grid-cols-3 gap-2">
                {[500, 300, 150].map((s) => (
                  <button 
                    key={s} 
                    className={`text-[10px] font-black px-5 py-2 rounded-lg uppercase transition-all border-2 ${rsvpSpeed === s ? "bg-[hsl(28,80%,55%)] text-slate-900 border-[hsl(28,80%,55%)]" : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600"}`} 
                    onClick={() => setRsvpSpeed(s)}
                  >
                    {s === 500 ? "Level 1" : s === 300 ? "Level 2" : "Alpha"}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest text-center max-w-[200px] leading-relaxed">
                Verifies working memory latency before high-stakes capital signing operations.
              </p>
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