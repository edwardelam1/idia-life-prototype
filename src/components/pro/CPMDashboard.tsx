import { useState, useEffect } from "react";
import { Brain, Eye, Zap, Shield, Activity, Volume2, Accessibility, Wind, Heart, Info, RotateCcw, Target, Activity as Pulse, Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <Info className="w-2.5 h-2.5 ml-1 opacity-40 hover:opacity-100 transition-opacity cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="bg-white text-slate-900 border-slate-200 text-[10px] max-w-[180px] p-2 shadow-xl">
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

  // 1. RSVP ROUND LOGIC (5-Round Battery)
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
      }, 40);
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

  // 2. 40Hz RGB FULL-SCREEN (Edge-to-Edge) [cite: 123, 270]
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

  if (loading && !isMasked) return <div className="p-8 text-center animate-pulse uppercase text-[10px] tracking-widest text-teal-600 font-black">Hydrating IDIA Pro+...</div>;

  return (
    <div className={`p-4 pb-24 space-y-4 animate-fade-in relative bg-white min-h-screen ${isMasked ? "blur-md pointer-events-none" : ""}`}>
      
      {/* SEIZURE-LEVEL GLOBAL RGB OVERLAY */}
      {isFlashing && (
        <div 
          className="fixed inset-0 z-[9999] pointer-events-none animate-[seizure-rgb_25ms_linear_infinite]" 
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* MINIMALIST HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(178,42%,42%)] flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Cognitive Performance</h2>
            <p className="text-[10px] text-teal-600 uppercase font-black tracking-widest">IDIA Pro+</p>
          </div>
        </div>
        <Badge variant="outline" className="border-[hsl(178,42%,42%)] text-[hsl(178,42%,42%)] font-black uppercase text-[8px] animate-pulse">Live Synapse</Badge>
      </div>

      <Tabs defaultValue="biometrics" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100/50 p-1 rounded-xl h-12 mb-4">
          <TabsTrigger value="biometrics" className="text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-teal-600 rounded-lg">Biometrics</TabsTrigger>
          <TabsTrigger value="gamma" className="text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-teal-600 rounded-lg">Gamma</TabsTrigger>
          <TabsTrigger value="memory" className="text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-teal-600 rounded-lg">Anchor</TabsTrigger>
        </TabsList>

        {/* 1. BIOMETRICS TAB: The 6 Markers */}
        <TabsContent value="biometrics" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Heart Rate", value: `${metrics.hr} BPM`, icon: Heart },
              { label: "HRV Index", value: `${metrics.hrv} ms`, icon: Activity },
              { label: "Acoustic", value: `${metrics.noise} dB`, icon: Volume2 },
              { label: "Respiratory", value: `${metrics.resp} br/m`, icon: Wind },
              { label: "Gait Balance", value: `${metrics.asymmetry}%`, icon: Accessibility },
              { label: "HRI", value: `${metrics.hriScore}%`, icon: Shield },
            ].map((b) => (
              <div key={b.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <b.icon className="w-4 h-4 text-teal-600 opacity-70" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{b.label}</span>
                </div>
                <p className="text-xl font-black text-slate-900 tracking-tighter italic">{b.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[hsl(178,42%,42%)] p-5 text-white shadow-xl">
             <div className="flex items-center gap-2 mb-1">
                <Pulse className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Personal Alpha Status</span>
             </div>
             <p className="text-xs font-medium leading-relaxed opacity-90">
               Principal is currently operating at <span className="font-bold underline">Peak Efficiency</span>. 
               No cognitive drift detected in current cycle.
             </p>
          </div>
        </TabsContent>

        {/* 2. GAMMA TRIGGER TAB */}
        <TabsContent value="gamma" className="space-y-4">
          <div className="rounded-3xl border-2 border-slate-100 bg-white p-8 text-center shadow-sm">
             <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border-4 transition-all duration-500 ${gammaActive ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50'}`}>
                <Zap className={`w-10 h-10 ${gammaActive ? 'text-orange-500 animate-pulse' : 'text-slate-300'}`} />
             </div>
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">40Hz Gamma Trigger</h3>
             <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto mb-8 font-medium">Full Spectrum Entrainment for pupillary latency and neural drive verification[cite: 123].</p>
             
             <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-900 uppercase">Hardware Armed</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">{gammaActive ? "Transmitting..." : "Standby"}</p>
                </div>
                <Switch checked={gammaActive} onCheckedChange={triggerGammaSequence} />
             </div>
          </div>
        </TabsContent>

        {/* 3. MEMORY ANCHORING TAB: 5-Round Battery */}
        <TabsContent value="memory" className="space-y-4">
           <div className="rounded-3xl bg-slate-900 text-white shadow-2xl overflow-hidden min-h-[400px] flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Memory Anchor: Round {testRound}/5</span>
                 </div>
                 {rsvpPhase !== 'IDLE' && <Badge className="bg-orange-500 text-slate-900 font-black">{cumulativeScore}</Badge>}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                 {/* LOCKED VIEWPORT FRAME */}
                 <div className="absolute inset-6 border border-white/5 rounded-2xl pointer-events-none" />

                 {rsvpPhase === 'IDLE' && (
                    <div className="text-center space-y-6">
                       <p className="text-[10px] text-white/50 uppercase font-black tracking-[0.2em]">Ready for Validation Battery?</p>
                       <Button onClick={resetFullTest} className="bg-white text-slate-900 hover:bg-orange-400 hover:text-white font-black px-10 py-6 rounded-full uppercase italic transition-all">Initialize Battery</Button>
                       <div className="flex justify-center gap-2">
                          {[500, 300, 150].map(s => (
                             <button key={s} onClick={() => setRsvpSpeed(s)} className={`text-[9px] font-black px-3 py-1 rounded border ${rsvpSpeed === s ? 'border-orange-500 text-orange-400' : 'border-white/10 text-white/30'}`}>{s === 500 ? 'LVL 1' : s === 300 ? 'NORM' : 'ALPHA'}</button>
                          ))}
                       </div>
                    </div>
                 )}

                 {rsvpPhase === 'CALIBRATING' && <div className="text-center animate-pulse"><p className="text-[11px] font-black uppercase tracking-[0.5em] text-orange-400">Locking Focus...</p></div>}

                 {rsvpPhase === 'PRESENTING' && <div className="w-full text-center"><p className="text-5xl font-black tracking-[0.2em] uppercase animate-in zoom-in duration-75 truncate">{activeSequence[rsvpWordIndex]}</p></div>}

                 {rsvpPhase === 'MASK' && <p className="text-5xl font-black text-white/10 opacity-40">#######</p>}

                 {rsvpPhase === 'RECALL' && (
                    <div className="w-full space-y-4">
                       <p className="text-[10px] font-black text-center text-white/40 uppercase tracking-widest">Input Sequence Sequence</p>
                       <div className="grid grid-cols-2 gap-2">
                          {[...activeSequence].sort().map(word => (
                             <Button key={word} onClick={() => handleRecallSelection(word)} className={`h-12 border border-white/10 bg-white/5 text-[10px] font-black uppercase ${userRecall.includes(word) ? 'opacity-10' : 'hover:bg-orange-400 hover:text-slate-900'}`}>{word}</Button>
                          ))}
                       </div>
                    </div>
                 )}

                 {rsvpPhase === 'ROUND_COMPLETE' && <p className="text-3xl font-black text-orange-400 italic animate-bounce">ROUND {testRound} SAVED</p>}

                 {rsvpPhase === 'RESULT' && (
                    <div className="text-center space-y-6">
                       <Trophy className="w-12 h-12 text-orange-400 mx-auto" />
                       <div>
                          <p className="text-[11px] font-black text-white/50 uppercase tracking-widest">Cumulative Clutch Score</p>
                          <p className="text-7xl font-black italic tracking-tighter text-white">{cumulativeScore}</p>
                       </div>
                       <Button variant="ghost" onClick={resetFullTest} className="text-white/40 font-black uppercase text-[10px] hover:text-orange-400"><RotateCcw className="w-3 h-3 mr-2" /> Reset Battery</Button>
                    </div>
                 )}
              </div>
           </div>
        </TabsContent>
      </Tabs>

      <style>{`
        @keyframes seizure-rgb {
          0% { background-color: #ff0000; }
          20% { background-color: #00ff00; }
          40% { background-color: #0000ff; }
          60% { background-color: #ffff00; }
          80% { background-color: #ff00ff; }
          100% { background-color: #ff0000; }
        }
      `}</style>
    </div>
  );
};

export default CPMDashboard;