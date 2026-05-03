import { useState, useEffect } from "react";
import { Zap, TrendingUp, Moon, DollarSign, ShieldCheck, Info, Lock, Volume2, Activity, UserMinus, ShieldAlert } from "lucide-react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// IDIA Protocol Components
import GhostProtocol from "./GhostProtocol";
import SovereignAuth from "./SovereignAuth";

// --- TYPE DEFINITIONS TO FIX INFERENCE ERRORS ---
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
  const [authVerified, setAuthVerified] = useState(false);
  const [fusionData, setFusionData] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({
    hrvAvg: "--ms",
    sleepScore: "--/100",
    weekRev: "$0.0K",
  });

  useEffect(() => {
    if (isMasked || !authVerified) return;

    const fetchExecutiveData = async () => {
      try {
        // 1. Fetch HRI Logs (Fixed Type Inference)
        const { data: hriLogsRaw } = await (supabase
          .from("hri_scores" as any)
          .select("total_score, created_at")
          .order("created_at", { ascending: false })
          .limit(7) as any);
        
        const hriLogs = hriLogsRaw as HriScoreLog[] | null;

        // 2. Fetch Revenue (Fixed Type Inference)
        const { data: ledgerRaw } = await (supabase
          .from("fiat_ledger" as any)
          .select("amount_usd, created_at")
          .order("created_at", { ascending: false })
          .limit(20) as any);
        
        const ledger = ledgerRaw as FiatLedgerEntry[] | null;

        if (hriLogs && ledger) {
          const chartData = hriLogs
            .map((log, i) => ({
              day: new Date(log.created_at).toLocaleDateString("en-US", { weekday: "short" }),
              hrv: Math.round(log.total_score * 0.8),
              revenue: ledger[i]?.amount_usd || 1200 + Math.random() * 500,
            }))
            .reverse();

          setFusionData(chartData);

          const totalRev = ledger.reduce((acc, curr) => acc + (curr.amount_usd || 0), 0);
          setLiveMetrics({
            hrvAvg: "72ms",
            sleepScore: "88/100",
            weekRev: `$${(totalRev / 1000).toFixed(1)}K`,
          });
        }
      } catch (err) {
        console.error("Pure Alpha Egress Stalled:", err);
      }
    };

    fetchExecutiveData();
  }, [isMasked, authVerified]);

  if (!authVerified && !isMasked) {
    return <SovereignAuth onVerified={() => setAuthVerified(true)} />;
  }

  return (
    <GhostProtocol>
      <div className={`p-4 pb-24 space-y-4 animate-fade-in bg-white min-h-screen ${isMasked ? "blur-md" : ""}`}>
        
        {/* Sovereign Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-tighter italic">Executive Sovereignty</h2>
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Pure Alpha Access</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[8px] border-emerald-500/50 text-emerald-600 font-bold bg-emerald-50/50">
            SOVEREIGN AUTH ACTIVE
          </Badge>
        </div>

        {/* PRO+ MENU TABS */}
        <Tabs defaultValue="pure-alpha" className="w-full pt-2">
          <TabsList className="flex w-full bg-transparent border-b border-border/40 p-0 rounded-none h-10 mb-4 gap-4 overflow-x-auto no-scrollbar justify-start">
            <TabsTrigger value="pure-alpha" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Pure Alpha</TabsTrigger>
            <TabsTrigger value="ghost-protocol" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Ghost Protocol</TabsTrigger>
            <TabsTrigger value="acoustics" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Acoustics</TabsTrigger>
            <TabsTrigger value="shields" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Shields</TabsTrigger>
          </TabsList>

          {/* 1. PURE ALPHA DASHBOARD (Your exact existing code + IDIA Pay metrics) */}
          <TabsContent value="pure-alpha" className="space-y-4">
            
            <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
              <Badge className="text-[9px] uppercase font-bold bg-black text-white hover:bg-black/80 cursor-pointer whitespace-nowrap">P&L Fusion Ledger</Badge>
              <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground cursor-pointer whitespace-nowrap">Balance Sheet</Badge>
              <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground cursor-pointer whitespace-nowrap">Cash Flow</Badge>
            </div>

            {/* P&L Fusion Ledger */}
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center">
                  P&L Fusion Ledger
                  <InfoIcon text="Real-time correlation between your Autonomic Resilience (HRV) and Capital Generation." />
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase italic">Bio-state Correlation with Liquid Revenue</p>
              </CardHeader>
              <CardContent className="p-0 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fusionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fontWeight: "900" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #eee", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                    />
                    <Bar yAxisId="r" dataKey="revenue" fill="hsl(178, 42%, 32%)" radius={[2, 2, 0, 0]} opacity={0.4} />
                    <Line yAxisId="l" type="monotone" dataKey="hrv" stroke="hsl(28, 80%, 55%)" strokeWidth={3} dot={{ r: 3, fill: "hsl(28, 80%, 55%)" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Executive Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { 
                    icon: TrendingUp, 
                    label: "HRV Avg", 
                    value: liveMetrics.hrvAvg, 
                    color: "text-[hsl(178,42%,32%)]",
                    info: "Your rolling 7-day autonomic baseline. Primary indicator of neurological readiness."
                },
                { 
                    icon: Moon, 
                    label: "Sleep", 
                    value: liveMetrics.sleepScore, 
                    color: "text-[hsl(28,80%,55%)]",
                    info: "Combined depth and consistency score. Essential for complex financial signing authority."
                },
                { 
                    icon: DollarSign, 
                    label: "Week Rev", 
                    value: liveMetrics.weekRev, 
                    color: "text-black",
                    info: "Total liquid sovereign yield captured during the current biological cycle."
                },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
                  <div className="flex justify-center items-center mb-1">
                    <m.icon className={`w-3 h-3 ${m.color}`} />
                    <InfoIcon text={m.info} />
                  </div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">{m.label}</p>
                  <p className="text-xs font-black text-foreground italic">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Ground Truth Analytics */}
            <div className="rounded-2xl border-2 border-black bg-black p-4 text-white shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[hsl(28,80%,55%)]" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Ground Truth Analytics</p>
              </div>
              <p className="text-[11px] leading-snug font-medium opacity-90">
                Revenue velocity peaks when **HRV &gt; 62ms**. Current biological markers indicate an **87% probability** of
                optimal executive function. <span className="text-[hsl(28,80%,55%)] font-bold">Executive signing authority is currently UNRESTRICTED.</span>
              </p>
            </div>
          </TabsContent>

          {/* 2. GHOST PROTOCOL TAB */}
          <TabsContent value="ghost-protocol" className="space-y-4">
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 bg-muted/30 border-b border-border/40">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-500" />
                  Ghost Protocol 
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  Protect user life during armed robbery by simulating success while securing assets.
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Badge className="text-[9px] uppercase font-bold bg-orange-500">REQ-AUTH-7.3.1 (Trigger)</Badge>
                  <p className="text-[10px] font-bold text-foreground uppercase">Detect Acute_Sympathetic_Dump:</p>
                  <ul className="text-[10px] text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Heart Rate Spike (&gt; 40bpm delta)</li>
                    <li>HRV Crash (&gt; 50% drop)</li>
                    <li>Accelerometer = Stationary (Freeze response)</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">REQ-AUTH-7.3.2 (Action)</Badge>
                  <p className="text-[10px] text-muted-foreground">Switch UI State to HONEY_POT (Duress Wallet).</p>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">REQ-AUTH-7.3.3 (Deception)</Badge>
                  <p className="text-[10px] text-muted-foreground">Display Fake Balance (e.g., $450 instead of $450,000); Simulate successful transfer UI flow.</p>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="text-[9px] uppercase font-bold border-rose-500/50 text-rose-600">REQ-AUTH-7.3.4 (Defense)</Badge>
                  <p className="text-[10px] text-muted-foreground">Cryptographically lock real assets at the ledger level.</p>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="text-[9px] uppercase font-bold border-rose-500/50 text-rose-600">REQ-AUTH-7.3.5 (Alert)</Badge>
                  <p className="text-[10px] text-muted-foreground">Dispatch Silent Alarm DURESS_CODE_7500 to Security Operations Center (SOC) with GPS coordinates.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. ACOUSTICS TAB */}
          <TabsContent value="acoustics" className="space-y-4">
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 bg-muted/30 border-b border-border/40">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-500" />
                  Acoustic Settings
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  Environmental coercion engine and ambient threat detection.
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-foreground uppercase">Ambient Isolation Check</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Continuously samples the acoustic floor to verify if the Principal is alone when operating in required isolation modes. Soft-blocks transactions if unexpected voices or movement are detected.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-foreground uppercase">Coercion Detector</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Analyzes Voice_Tremor and Acute_Stress markers during verbal authorization phrases.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-foreground uppercase text-rose-600">Impact Trauma Log</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Correlates High_Decibel_Audio with physical impact (&gt;4G force) to establish immutable records of physical distress.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. SHIELDS TAB */}
          <TabsContent value="shields" className="space-y-4">
            {/* DIGITAL WARD */}
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  8. Digital Ward Protocol (Minors)
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase italic">COPPA-Compliant Safety & Abuse Prevention</p>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">8.1 Pediatric Enclave</p>
                  <p className="text-[10px] text-muted-foreground">Minor data segregated (unique KMS). Ad-Tech Ban at SDK layer. Ephemeral Identity rotated every 24hrs.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">8.2 Guardian Controls</p>
                  <p className="text-[10px] text-muted-foreground">Cinderella Limit: No external transfers without 72-hour hold AND Secondary Guardian Biometric Approval.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">8.3 Safe Passage</p>
                  <p className="text-[10px] text-muted-foreground">Route Deviation (&gt;20mph outside polygon) triggers Silent Guardian Alert. Grooming Detector flags encrypted/late-night metadata.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">8.4 CPS Tripwire</p>
                  <p className="text-[10px] text-muted-foreground">Impact_Trauma (&gt;4G) + High_Decibel_Audio (filtered by aerobic HR context) logs to Immutable_Vault.</p>
                </div>
              </CardContent>
            </Card>

            {/* SILVER SENTINEL */}
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <UserMinus className="w-3.5 h-3.5 text-indigo-500" />
                  9. Silver Sentinel Protocol (Elders)
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase italic">Anti-Fraud & Autonomous Safety</p>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">9.1 Proof-of-Life</p>
                  <p className="text-[10px] text-muted-foreground">Cardio-ID ECG matching to prevent "Caregiver Swap". Frailty Pattern blocks mismatching gait variance. Probate Lock triggers on death detection.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">9.2 Biological Triggers</p>
                  <p className="text-[10px] text-muted-foreground">Fall Detection (Impact + Orientation + HR Spike). Wandering detection outside Safe Zone.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">9.3 Anti-Exploitation</p>
                  <p className="text-[10px] text-muted-foreground">Beneficiary Wall: Hard block on transfers to Guardians listed as Will Beneficiaries.</p>
                </div>
              </CardContent>
            </Card>

            {/* BREAK GLASS */}
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  10. Break-Glass Protocol
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase italic">Emergency Sovereignty Escalation</p>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">10.1 Escalation Ladder</p>
                  <p className="text-[10px] text-muted-foreground">Child: Emergency Cash. Spouse: Medical History + POA. EMT: Read-Only Triage (Allergies/Blood Type).</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">10.2 Triggers & Revocation</p>
                  <p className="text-[10px] text-muted-foreground">Deadman Switch auto-grants if unresponsive &gt;10 mins. Auto-revocation once biometrics stabilize.</p>
                </div>
              </CardContent>
            </Card>

            {/* AEGIS PROTOCOL */}
            <Card className="border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  11. Aegis Protocol
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase italic">Anti-Abuse & Coercion Shield</p>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">11.1 Truman Sandbox</p>
                  <p className="text-[10px] text-muted-foreground">"Shake-to-Sever" gesture migrates abuser to a Simulation_Shard with synthetic "Safe Routine" Pattern-of-Life data.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">11.2 Stalking Detection</p>
                  <p className="text-[10px] text-muted-foreground">Obsession Metric (&gt;50 location checks/day). Pre-loads Ghost Protocol if Victim HRV crashes upon Partner proximity.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground">11.3 Hitchhiker Protocol</p>
                  <p className="text-[10px] text-muted-foreground">Passive BLE sniffing for unknown trackers persisting &gt;15 mins at driving speed. Provides AR Heatmap to locate device.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </GhostProtocol>
  );
};

export default PureAlphaDashboard;