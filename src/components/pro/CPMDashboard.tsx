import { useState, useEffect } from "react";
import { Brain, Eye, Zap, Shield, Activity, Volume2, Accessibility, Wind, Heart, Info, RotateCcw, Target, Activity as Pulse, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  
  // --- 5-ROUND RSVP ENGINE ---
  const [rsvpPhase, setRsvpPhase] = useState<'IDLE' | 'CALIBRATING' | 'PRESENTING' | 'MASK' | 'RECALL' | 'ROUND_COMPLETE' | 'RESULT'>('IDLE');
  const [testRound, setTestRound] = useState(1);
  const [rsvpWordIndex, setRsvpWordIndex] = useState(0);
  const [rsvpSpeed, setRsvpSpeed] = useState(300);
  const [activeSequence, setActiveSequence] = useState<string[]>([]);
  const [userRecall, setUserInput] = useState<string[]>([]);
  const [cumulativeScore, setCumulativeScore] = useState(0);

  const [metrics, setMetrics] = useState({
    hr: 0, hrv: 0, resp: 0, noise: 0, asymmetry: 0,
    focusScore: 0, stressIndex: 0, recovery: 0, hriScore: 0,
    status: "CALIBRATING" as "CALIBRATING" | "ARMED" | "TRIGGERED"
  });

  // 1. RSVP ROUND LOGIC
  useEffect(() => {
    if (rsvpPhase === 'PRESENTING') {
      const timer = setTimeout(() => setRsvpPhase('MASK'), rsvpSpeed);
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
      }, 40); // Standardized neural mask
      return () => clearTimeout(timer);
    }
  }, [rsvpPhase, rsvpSpeed, rsvpWordIndex, activeSequence]);

  const startNewRound = (round: number) => {
    const sequence = [...RSVP_WORDS].sort(() => 0.5 - Math.random()).slice(0, 5);
    setActiveSequence(sequence);
    setUserInput([]);
    setRsvpWordIndex(0);
    setTestRound(round);
    setRsvpPhase('CALIBRATING');
    setTimeout(() => setRsvpPhase('PRESENTING'), 1200);
  };

  const resetFullTest = () => {
    setCumulativeScore(0);
    startNewRound(1);
  };

  const handleRecallSelection = (word: string) => {
    if (userRecall.includes(word)) return;
    const newRecall = [...userRecall, word];
    setUserInput(newRecall);
    
    if (newRecall.length === activeSequence.length) {
      const correct = newRecall.filter((w, i) => w === activeSequence[i]).length;
      const roundScore = Math.round((correct / activeSequence.length * 100) * (1000 / rsvpSpeed));
      setCumulativeScore(prev => prev + roundScore);
      
      if (testRound < 5) {
        setRsvpPhase('ROUND_COMPLETE');
        setTimeout(() => startNewRound(testRound + 1), 1500);
      } else {
        setRsvpPhase('RESULT');
      }
    }
  };

  // 2. 40Hz RGB FULL-SCREEN BRIDGE
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

  // 3. Hydration (Intact)
  useEffect(() => {
    if (isMasked) return;
    let isMounted = true;
    const stream = async () => {
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
      const ch = supabase.channel("cpm_feed").on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "staged_health_data" }, (p: any) => {
        const n = p.new as StagedHealthData;
        if (n && isMounted) setMetrics(prev => ({...prev, hr: n.heart_rate || prev.hr, hrv: n.heart_rate_variability_ms || prev.hrv, focusScore: n.data_quality_score ? Math.round(n.data_quality_score * 100) : prev.focusScore }));
      }).subscribe();
      return ch;
    };
    const promise = stream();
    return () => { isMounted = false; promise.then(c => { if(c) supabase.removeChannel(c); }); };
  }, [isMasked]);

  if (loading && !isMasked) return <div className="p-8 text-center animate-pulse uppercase text-[10px] tracking-widest text-muted-foreground font-black">Hydrating IDIA Pro+...</div>;

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in relative bg-background min-h-screen overflow-x-hidden">
      
      {/* SEIZURE-LEVEL RGB 40Hz OVERLAY (FIXED INSET-0 EDGE TO EDGE) */}
      {isFlashing && (
        <div 
          className="fixed inset-0 z-[999] pointer-events-none animate-[seizure-rgb_25ms_linear_infinite]" 
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)] flex items-center justify-center shadow-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div><h2 className="font-semibold text-foreground text-sm uppercase">Cognitive Performance</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">IDIA Life Pro+</p></div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(28,80%,55%)]/10 border border-[hsl(28,80%,55%)]/20"><span className="text-[8px] font-bold text-[hsl(28,80%,55%)] uppercase">Live Synapse</span></div>
      </div>

      {/* BIOMETRIC GRIDS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
          <h3 className="text-[9px] font-black text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-widest"><Eye className="w-3 h-3 text-[hsl(28,80%,55%)]" />Focus / Recovery</h3>
          <div className="space-y-3">
            <div><p className="text-[8px] font-black text-muted-foreground uppercase">Focus</p><p className="text-xl font-black text-foreground">{metrics.focusScore}%</p></div>
            <div><p className="text-[8px] font-black text-muted-foreground uppercase">Recovery</p><p className="text-xl font-black text-foreground">{metrics.recovery}%</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
          <h3 className="text-[9px] font-black text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-widest"><Pulse className="w-3 h-3 text-[hsl(28,80%,55%)]" />Bio-State</h3>
          <div className="space-y-3">
            <div><p className="text-[8px] font-black text-muted-foreground uppercase">HRI Score</p><p className="text-xl font-black text-foreground">{metrics.hriScore}%</p></div>
            <div><p className="text-[8px] font-black text-muted-foreground uppercase">Autonomic</p><p className="text-xl font-black text-foreground">{metrics.hrv}ms</p></div>
          </div>
        </div>
      </div>

      {/* GAMMA TRIGGER */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Zap className={`w-5 h-5 ${gammaActive ? "text-orange-500 animate-pulse" : "text-muted-foreground"}`} /><div><h3 className="text-xs font-black text-foreground uppercase tracking-wider">40Hz RGB Gamma Trigger</h3><p className="text-[9px] font-bold text-muted-foreground uppercase">Full Spectrum Entrainment</p></div></div>
          <Switch checked={gammaActive} onCheckedChange={triggerGammaSequence} />
        </div>
      </div>

      {/* INDUSTRIAL RSVP INSTRUMENT (5-ROUND) */}
      <div className="rounded-3xl border-2 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[hsl(28,80%,55%)]" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Memory Anchor: Round {testRound}/5</h3>
          </div>
          {rsvpPhase !== 'IDLE' && <div className="text-[10px] font-mono text-[hsl(28,80%,55%)] font-black">Score: {cumulativeScore}</div>}
        </div>

        <div className="min-h-[280px] bg-black flex flex-col items-center justify-center p-6 relative">
          <div className="absolute inset-4 border border-slate-800 pointer-events-none opacity-30" />

          {rsvpPhase === 'CALIBRATING' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[hsl(28,80%,55%)] border-t-transparent animate-spin" />
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[hsl(28,80%,55%)]">Syncing Round {testRound}</p>
            </div>
          )}

          {rsvpPhase === 'PRESENTING' && (
            <div className="w-full text-center overflow-hidden">
              <div className="text-4xl sm:text-6xl font-black text-white tracking-[0.15em] break-words uppercase px-2 animate-in zoom-in duration-75">
                {activeSequence[rsvpWordIndex]}
              </div>
            </div>
          )}

          {rsvpPhase === 'MASK' && <div className="text-5xl font-black text-slate-800 opacity-40">#######</div>}

          {rsvpPhase === 'RECALL' && (
            <div className="w-full space-y-6 z-10">
              <p className="text-[10px] font-black text-center text-slate-400 uppercase tracking-[0.2em]">Input Sequence Sequence</p>
              <div className="grid grid-cols-2 gap-2">
                {[...activeSequence].sort().map((word) => (
                  <Button 
                    key={word} 
                    variant="outline" 
                    className={`text-[10px] font-black uppercase h-12 border-slate-700 bg-slate-900/50 text-slate-300 ${userRecall.includes(word) ? 'opacity-20 pointer-events-none' : 'hover:border-orange-500'}`}
                    onClick={() => handleRecallSelection(word)}
                  >
                    {word}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {rsvpPhase === 'ROUND_COMPLETE' && (
            <div className="text-center animate-bounce">
              <p className="text-3xl font-black text-emerald-500 italic">ROUND {testRound} SAVED</p>
            </div>
          )}

          {rsvpPhase === 'RESULT' && (
            <div className="text-center space-y-4">
              <Trophy className="w-10 h-10 text-orange-400 mx-auto" />
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cumulative Clutch Score</p>
                <p className="text-7xl font-black italic text-white tracking-tighter">{cumulativeScore}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-[10px] font-black text-slate-400 uppercase hover:text-white" onClick={resetFullTest}>
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset Battery
              </Button>
            </div>
          )}

          {rsvpPhase === 'IDLE' && (
            <div className="flex flex-col items-center gap-8">
              <Button className="bg-[hsl(28,80%,55%)] text-slate-900 font-black px-12 py-6 rounded-full text-lg uppercase italic shadow-[0_0_30px_rgba(251,146,60,0.3)]" onClick={resetFullTest}>Initialize Battery</Button>
              <div className="flex gap-2">
                {[500, 300, 150].map((s) => (
                  <button key={s} className={`text-[9px] font-black px-4 py-1 rounded border-2 ${rsvpSpeed === s ? "border-orange-500 text-white" : "border-slate-800 text-slate-500"}`} onClick={() => setRsvpSpeed(s)}>
                    {s === 500 ? "LVL 1" : s === 300 ? "LVL 2" : "ALPHA"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes seizure-rgb {
          0% { background-color: #ff0000; }
          25% { background-color: #00ff00; }
          50% { background-color: #0000ff; }
          75% { background-color: #ffffff; }
          100% { background-color: #ff0000; }
        }
      `}</style>
    </div>
  );
};

export default CPMDashboard;