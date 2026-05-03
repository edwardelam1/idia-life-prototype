import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Zap, Info, Lock, Volume2, Target, RotateCcw, Smartphone 
} from "lucide-react";
import { ComposedChart, Line, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// IDIA Protocol Components
import GhostProtocolWrapper from "./GhostProtocol";
import SovereignAuth from "./SovereignAuth";

// --- TYPE DEFINITIONS ---
interface HriScoreLog {
  total_score: number;
  created_at: string;
}

interface FiatLedgerEntry {
  amount_usd: number;
  created_at: string;
}

interface PureAlphaDashboardProps {
  isMasked?: boolean;
}

const RSVP_WORDS = ["FOCUS", "CLARITY", "RESOLVE", "EXECUTE", "DOMINATE", "OPTIMIZE", "TRANSCEND", "SOVEREIGN", "VELOCITY", "BASELINE", "INTEGRITY", "ALPHA"];

// Minimalist Info Helper
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

const PureAlphaDashboard = ({ isMasked = false }: PureAlphaDashboardProps) => {
  // --- CORE STATE ---
  const [authVerified, setAuthVerified] = useState(false);
  const [fusionData, setFusionData] = useState<any[]>([]);
  
  // Controls the sub-view inside the Pure Alpha tab
  const [pureAlphaView, setPureAlphaView] = useState<'fusion' | 'balance' | 'cash' | 'ghost' | 'acoustics'>('fusion');

  // --- GAMMA & RSVP STATE ---
  const [gammaActive, setGammaActive] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  
  const [rsvpPhase, setRsvpPhase] = useState<'IDLE' | 'CALIBRATING' | 'PRESENTING' | 'MASK' | 'RECALL' | 'ROUND_COMPLETE' | 'RESULT'>('IDLE');
  const [testRound, setTestRound] = useState(1);
  const [rsvpWordIndex, setRsvpWordIndex] = useState(0);
  const [rsvpSpeed, setRsvpSpeed] = useState(300);
  const [activeSequence, setActiveSequence] = useState<string[]>([]);
  const [userRecall, setUserInput] = useState<string[]>([]);
  const [cumulativeScore, setCumulativeScore] = useState(0);

  // --- ADJUSTABLE SETTINGS STATE ---
  const [settings, setSettings] = useState({
    honeyPot: true,
    digitalWard: false,
    silverSentinel: false,
    aegisProtocol: true,
    ambientIsolation: true,
    coercionDetector: true,
    impactTraumaSync: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- DATA FETCHING (Zero Mock Data) ---
  useEffect(() => {
    if (isMasked || !authVerified) return;

    const fetchExecutiveData = async () => {
      try {
        const { data: hriLogsRaw } = await (supabase
          .from("hri_scores" as any)
          .select("total_score, created_at")
          .order("created_at", { ascending: false })
          .limit(7) as any);
        
        const hriLogs = hriLogsRaw as HriScoreLog[] | null;

        const { data: ledgerRaw } = await (supabase
          .from("fiat_ledger" as any)
          .select("amount_usd, created_at")
          .order("created_at", { ascending: false })
          .limit(7) as any);
        
        const ledger = ledgerRaw as FiatLedgerEntry[] | null;

        if (hriLogs && ledger) {
          const chartData = hriLogs
            .map((log, i) => ({
              day: new Date(log.created_at).toLocaleDateString("en-US", { weekday: "short" }),
              hrv: Math.round(log.total_score * 0.8),
              revenue: ledger[i]?.amount_usd || 0,
            }))
            .reverse();

          setFusionData(chartData);
        }
      } catch (err) {
        console.error("Pure Alpha Egress Stalled:", err);
      }
    };

    fetchExecutiveData();
  }, [isMasked, authVerified]);

  // --- GAMMA & RSVP LOGIC ---
  const getDynamicFontSize = (word: string) => {
    const len = word.length;
    if (len > 10) return "text-[8vw]"; 
    if (len > 8) return "text-[10vw]"; 
    return "text-[12vw]"; 
  };

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

  const toggleOrientation = (landscape: boolean) => {
    if (window.webkit?.messageHandlers?.syncHealthData) {
      window.webkit.messageHandlers.syncHealthData.postMessage({ 
        action: landscape ? "CMD_LOCK_LANDSCAPE" : "CMD_LOCK_PORTRAIT" 
      });
    }
  };

  const startNewRound = (round: number) => {
    const sequence = [...RSVP_WORDS].sort(() => 0.5 - Math.random()).slice(0, 5);
    setActiveSequence(sequence);
    setUserInput([]);
    setRsvpWordIndex(0);
    setTestRound(round);
    setRsvpPhase('CALIBRATING');
    setTimeout(() => setRsvpPhase('PRESENTING'), 1000);
  };

  const resetFullTest = () => {
    setCumulativeScore(0);
    toggleOrientation(true);
    startNewRound(1);
  };

  const endTest = () => {
    setRsvpPhase('IDLE');
    toggleOrientation(false);
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
        setTimeout(() => startNewRound(testRound + 1), 1200);
      } else {
        setRsvpPhase('RESULT');
      }
    }
  };

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

  // --- RENDER ---
  if (!authVerified && !isMasked) {
    return <SovereignAuth onVerified={() => setAuthVerified(true)} />;
  }

  return (
    <GhostProtocolWrapper>
      {/* GLOBAL RGB FLASH OVERRIDE */}
      {isFlashing && createPortal(
        <div 
          className="fixed -inset-[200%] z-[99999] pointer-events-none animate-[seizure-rgb_25ms_linear_infinite]" 
          style={{ mixBlendMode: 'difference' }}
        />,
        document.body
      )}

      <div className={`p-4 pb-24 space-y-4 animate-fade-in bg-white min-h-screen font-sans ${isMasked ? "blur-md pointer-events-none" : ""}`}>
        
        {/* Sovereign Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(178,42%,42%)] flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-tighter">Executive Sovereignty</h2>
              <p className="text-[10px] text-teal-600 uppercase font-black tracking-widest">Pure Alpha Access</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[8px] border-teal-100 text-teal-600 font-bold px-2 py-0 uppercase">
            Auth Active
          </Badge>
        </div>

        {/* PRO+ MENU TABS (Pure Alpha, Gamma, Anchor) */}
        <Tabs defaultValue="pure-alpha" className="w-full">
          <TabsList className="flex w-full bg-transparent border-b border-slate-100 p-0 rounded-none h-10 mb-6 gap-8 overflow-x-auto no-scrollbar justify-start">
            <TabsTrigger value="pure-alpha" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Pure Alpha</TabsTrigger>
            <TabsTrigger value="gamma" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Gamma</TabsTrigger>
            <TabsTrigger value="memory" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Anchor</TabsTrigger>
          </TabsList>

          {/* 1. PURE ALPHA TAB */}
          <TabsContent value="pure-alpha" className="space-y-6 focus-visible:outline-none">
            
            {/* Dynamic Buttons Row */}
            <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar pb-2">
              <Badge 
                onClick={() => setPureAlphaView('fusion')}
                className={`text-[10px] uppercase font-bold cursor-pointer whitespace-nowrap px-3 py-1 ${pureAlphaView === 'fusion' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
              >
                P&L Fusion
              </Badge>
              <Badge 
                onClick={() => setPureAlphaView('balance')}
                className={`text-[10px] uppercase font-bold cursor-pointer whitespace-nowrap px-3 py-1 ${pureAlphaView === 'balance' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
              >
                Balance Sheet
              </Badge>
              <Badge 
                onClick={() => setPureAlphaView('cash')}
                className={`text-[10px] uppercase font-bold cursor-pointer whitespace-nowrap px-3 py-1 ${pureAlphaView === 'cash' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
              >
                Cash Flow
              </Badge>
              <Badge 
                onClick={() => setPureAlphaView('ghost')}
                className={`text-[10px] uppercase font-bold cursor-pointer whitespace-nowrap px-3 py-1 ${pureAlphaView === 'ghost' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
              >
                Ghost Protocol
              </Badge>
              <Badge 
                onClick={() => setPureAlphaView('acoustics')}
                className={`text-[10px] uppercase font-bold cursor-pointer whitespace-nowrap px-3 py-1 ${pureAlphaView === 'acoustics' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
              >
                Acoustics
              </Badge>
            </div>

            {/* CONDITIONAL RENDERING BASED ON ACTIVE BUTTON */}

            {pureAlphaView === 'fusion' && (
              <Card className="border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center text-slate-900">
                    P&L Fusion Ledger
                    <InfoIcon text="Real-time correlation between your Autonomic Resilience (HRV) and Capital Generation." />
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Bio-State vs Liquid Revenue</p>
                </CardHeader>
                <CardContent className="p-0 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fusionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: "900" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "10px", fontWeight: "bold" }}
                      />
                      <Bar yAxisId="r" dataKey="revenue" fill="hsl(178, 42%, 42%)" radius={[4, 4, 0, 0]} opacity={0.8} />
                      <Line yAxisId="l" type="monotone" dataKey="hrv" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {pureAlphaView === 'balance' && (
              <Card className="border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="p-5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center text-slate-900">
                    Balance Sheet
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Asset & Liability Overview</p>
                </CardHeader>
                <CardContent className="p-5 text-center text-slate-400 text-[10px] uppercase font-black">
                  [ BALANCE SHEET DATA ENDPOINT ]
                </CardContent>
              </Card>
            )}

            {pureAlphaView === 'cash' && (
              <Card className="border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="p-5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center text-slate-900">
                    Cash Flow
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Liquidity Velocity</p>
                </CardHeader>
                <CardContent className="p-5 text-center text-slate-400 text-[10px] uppercase font-black">
                  [ CASH FLOW DATA ENDPOINT ]
                </CardContent>
              </Card>
            )}

            {pureAlphaView === 'ghost' && (
              <Card className="border-orange-100 bg-orange-50/30 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="p-5 pb-2 border-b border-orange-100/50">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
                    <Lock className="w-4 h-4 text-orange-500" />
                    Ghost Protocol Settings
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Configure autonomous duress defense and enclave routing.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Honey Pot State */}
                  <div className="flex items-center justify-between p-4 border-b border-orange-100/50">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">Honey-Pot State</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Simulate success & lock true ledger during HRV crash.</p>
                    </div>
                    <Switch checked={settings.honeyPot} onCheckedChange={() => toggleSetting('honeyPot')} className="data-[state=checked]:bg-orange-500" />
                  </div>
                  
                  {/* Shields folded into Ghost Protocol settings */}
                  <div className="flex items-center justify-between p-4 border-b border-orange-100/50">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">Digital Ward (Minors)</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Segregate data & trigger route deviation alerts.</p>
                    </div>
                    <Switch checked={settings.digitalWard} onCheckedChange={() => toggleSetting('digitalWard')} />
                  </div>
                  <div className="flex items-center justify-between p-4 border-b border-orange-100/50">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">Silver Sentinel (Elders)</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Cardio-ID verification & beneficiary wall blocks.</p>
                    </div>
                    <Switch checked={settings.silverSentinel} onCheckedChange={() => toggleSetting('silverSentinel')} />
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">Aegis Protocol</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Truman sandbox & foreign IoT tracker sniffing.</p>
                    </div>
                    <Switch checked={settings.aegisProtocol} onCheckedChange={() => toggleSetting('aegisProtocol')} />
                  </div>
                </CardContent>
              </Card>
            )}

            {pureAlphaView === 'acoustics' && (
              <Card className="border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="p-5 pb-2 border-b border-slate-50">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
                    <Volume2 className="w-4 h-4 text-indigo-500" />
                    Acoustic Settings
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Manage environmental coercion and ambient threat engines.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4 border-b border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">Ambient Isolation</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Soft-block if unexpected voices are detected.</p>
                    </div>
                    <Switch checked={settings.ambientIsolation} onCheckedChange={() => toggleSetting('ambientIsolation')} />
                  </div>
                  <div className="flex items-center justify-between p-4 border-b border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">Coercion Detector</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Analyze voice tremor & acute stress markers.</p>
                    </div>
                    <Switch checked={settings.coercionDetector} onCheckedChange={() => toggleSetting('coercionDetector')} />
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-[10px] font-black text-rose-600 uppercase">Impact Trauma Sync</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Log high-decibel audio + physical impact to vault.</p>
                    </div>
                    <Switch checked={settings.impactTraumaSync} onCheckedChange={() => toggleSetting('impactTraumaSync')} className="data-[state=checked]:bg-rose-500" />
                  </div>
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {/* 2. GAMMA TRIGGER TAB */}
          <TabsContent value="gamma" className="space-y-6 focus-visible:outline-none">
            <div className="rounded-3xl border border-slate-50 bg-slate-50/30 p-10 text-center shadow-sm">
               <div className={`w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center border-4 transition-all duration-700 ${gammaActive ? 'border-orange-500 bg-orange-50 scale-110 shadow-[0_0_40px_rgba(249,115,22,0.15)]' : 'border-white bg-white'}`}>
                  <Zap className={`w-10 h-10 ${gammaActive ? 'text-orange-500 animate-pulse' : 'text-slate-200'}`} />
               </div>
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4">40Hz Entrainment Trigger</h3>
               <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto mb-10 font-medium leading-relaxed">Active stimulation for pupillary response testing and neural drive peaking.</p>
               
               <div className="flex items-center justify-between bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <div className="text-left">
                     <p className="text-[10px] font-black text-slate-900 uppercase">Hardware Pulse</p>
                     <p className="text-[9px] text-teal-600 font-bold uppercase tracking-tighter">{gammaActive ? "Transmitting" : "Standby"}</p>
                  </div>
                  <Switch checked={gammaActive} onCheckedChange={triggerGammaSequence} className="data-[state=checked]:bg-orange-500" />
               </div>
            </div>
          </TabsContent>

          {/* 3. MEMORY ANCHORING TAB */}
          <TabsContent value="memory" className="space-y-6 focus-visible:outline-none">
             <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden min-h-[460px] flex flex-col">
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Memory Anchor: {rsvpPhase !== 'IDLE' ? `${testRound}/5` : 'Validation'}</span>
                   </div>
                   {rsvpPhase !== 'IDLE' && <Badge className="bg-orange-500 text-white font-black text-[9px] px-2.5">{cumulativeScore}</Badge>}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                   {rsvpPhase === 'IDLE' && (
                      <div className="text-center space-y-10">
                         <div className="space-y-2">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.25em]">Operational Calibration</p>
                            <Smartphone className="w-8 h-8 text-slate-300 mx-auto animate-bounce mt-4" />
                            <p className="text-[11px] text-slate-600 font-medium max-w-[190px]">Turn device horizontally to lock orientation for validation battery.</p>
                         </div>
                         <Button onClick={resetFullTest} className="bg-slate-900 text-white hover:bg-orange-500 font-black px-12 py-7 rounded-full uppercase italic transition-all shadow-md">Initialize Battery</Button>
                         <div className="flex justify-center gap-4">
                            {[500, 300, 150].map(s => (
                               <button key={s} onClick={() => setRsvpSpeed(s)} className={`text-[9px] font-black px-4 py-2 rounded-full border-2 transition-all ${rsvpSpeed === s ? 'border-teal-600 text-teal-600' : 'border-slate-50 text-slate-300'}`}>{s === 500 ? 'LVL 1' : s === 300 ? 'NORM' : 'ALPHA'}</button>
                            ))}
                         </div>
                      </div>
                   )}

                   {rsvpPhase === 'CALIBRATING' && (
                      <div className="text-center space-y-4">
                         <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto" />
                         <p className="text-[11px] font-black uppercase tracking-[0.5em] text-teal-600">Locking Focus</p>
                      </div>
                   )}

                   {rsvpPhase === 'PRESENTING' && (
                      <div className="w-full text-center px-4 h-32 flex items-center justify-center overflow-hidden">
                         <p className={`${getDynamicFontSize(activeSequence[rsvpWordIndex])} font-black tracking-[0.2em] text-slate-900 uppercase animate-in zoom-in duration-75 whitespace-nowrap drop-shadow-sm leading-none`}>
                            {activeSequence[rsvpWordIndex]}
                         </p>
                      </div>
                   )}

                   {rsvpPhase === 'MASK' && <p className="text-6xl font-black text-slate-50 select-none">#######</p>}

                   {rsvpPhase === 'RECALL' && (
                      <div className="w-full space-y-6">
                         <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-[0.3em]">Sequence Verification</p>
                         <div className="grid grid-cols-2 gap-3">
                            {[...activeSequence].sort().map(word => (
                               <Button key={word} onClick={() => handleRecallSelection(word)} variant="outline" className={`h-14 border-2 text-[11px] font-black uppercase transition-all ${userRecall.includes(word) ? 'bg-slate-50 text-slate-300 border-slate-50 scale-95 opacity-40' : 'border-slate-50 text-slate-700 hover:border-teal-500 hover:text-teal-600 shadow-sm'}`}>{word}</Button>
                            ))}
                         </div>
                      </div>
                   )}

                   {rsvpPhase === 'ROUND_COMPLETE' && <p className="text-3xl font-black text-teal-600 italic tracking-tighter uppercase animate-pulse">ROUND {testRound} LOGGED</p>}

                   {rsvpPhase === 'RESULT' && (
                      <div className="text-center space-y-10 animate-in zoom-in duration-500">
                         <Trophy className="w-20 h-20 text-orange-500 mx-auto" />
                         <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Cumulative Clutch Score</p>
                            <p className="text-9xl font-black italic tracking-tighter text-slate-900 leading-none text-center">{cumulativeScore}</p>
                         </div>
                         <Button variant="ghost" onClick={endTest} className="text-slate-300 font-black uppercase text-[11px] hover:text-teal-600 tracking-[0.2em] text-center"><RotateCcw className="w-4 h-4 mr-2" /> Exit to Portrait</Button>
                      </div>
                   )}
                </div>
             </div>
          </TabsContent>
        </Tabs>

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
    </GhostProtocolWrapper>
  );
};

export default PureAlphaDashboard;