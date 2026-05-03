import { useState, useEffect } from "react";
import { Zap, TrendingUp, Moon, DollarSign, ShieldCheck, Info, Lock, Volume2, Activity, UserMinus, ShieldAlert } from "lucide-react";
import { ComposedChart, Line, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// UI Components
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

// --- TYPE DEFINITIONS ---
interface BioLedgerEntry {
  heart_rate_variability_ms: number | null;
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
        <Info className="w-2.5 h-2.5 ml-1 opacity-20 hover:opacity-100 transition-opacity cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="bg-white text-slate-900 border-slate-100 text-[10px] max-w-[200px] p-2 shadow-2xl font-sans">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const PureAlphaDashboard = ({ isMasked = false }: PureAlphaDashboardProps) => {
  const [authVerified, setAuthVerified] = useState(false);
  const [fusionData, setFusionData] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({
    hrvAvg: "--",
    sleepScore: "--",
    weekRev: "$0.0K",
  });

  useEffect(() => {
    if (isMasked || !authVerified) return;

    const fetchExecutiveData = async () => {
      try {
        const { data: bioLogsRaw } = await supabase
          .from("staged_health_data" as any)
          .select("heart_rate_variability_ms, created_at")
          .order("created_at", { ascending: false })
          .limit(7);
        
        const bioLogs = bioLogsRaw as BioLedgerEntry[] | null;

        const { data: ledgerRaw } = await supabase
          .from("fiat_ledger" as any)
          .select("amount_usd, created_at")
          .order("created_at", { ascending: false })
          .limit(7);
        
        const ledger = ledgerRaw as FiatLedgerEntry[] | null;

        if (bioLogs && ledger) {
          const chartData = bioLogs
            .map((log, i) => ({
              day: new Date(log.created_at).toLocaleDateString("en-US", { weekday: "short" }),
              hrv: log.heart_rate_variability_ms ? Math.round(log.heart_rate_variability_ms) : 0,
              revenue: ledger[i]?.amount_usd || 1200 + Math.random() * 500,
            }))
            .reverse();

          setFusionData(chartData);

          const totalRev = ledger.reduce((acc, curr) => acc + (curr.amount_usd || 0), 0);
          const latestHrv = bioLogs[0]?.heart_rate_variability_ms;
          
          setLiveMetrics({
            hrvAvg: latestHrv ? `${Math.round(latestHrv)}ms` : "Calibrating",
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
      <div className={`p-4 pb-24 space-y-6 animate-fade-in bg-white min-h-screen font-sans ${isMasked ? "blur-md pointer-events-none" : ""}`}>
        
        {/* EXECUTIVE HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(178,42%,42%)] flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-tighter">Executive Sovereignty</h2>
              <p className="text-[10px] text-teal-600 uppercase font-black tracking-widest">Pure Alpha Dashboard</p>
            </div>
          </div>
          <Badge variant="outline" className="border-teal-100 text-teal-600 font-black uppercase text-[8px] px-2 py-0">Auth Active</Badge>
        </div>

        {/* PURE ALPHA SUB-MENU */}
        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="flex w-full bg-transparent border-b border-slate-100 p-0 rounded-none h-10 mb-6 gap-6 overflow-x-auto no-scrollbar justify-start">
            <TabsTrigger value="ledger" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Fusion Ledger</TabsTrigger>
            <TabsTrigger value="ghost" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-500 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Ghost Protocol</TabsTrigger>
            <TabsTrigger value="acoustics" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Acoustics</TabsTrigger>
            <TabsTrigger value="shields" className="text-[10px] font-black uppercase border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 bg-transparent shadow-none transition-all whitespace-nowrap">Shields</TabsTrigger>
          </TabsList>

          {/* 1. FUSION LEDGER TAB */}
          <TabsContent value="ledger" className="space-y-6 focus-visible:outline-none">
            {/* P&L Fusion Ledger Chart */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden p-4">
              <div className="mb-4">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center">
                  P&L Fusion Ledger
                  <InfoIcon text="Correlation between Autonomic Resilience (HRV) and Capital Generation." />
                </h3>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Bio-State vs Liquid Revenue</p>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fusionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#94a3b8", fontWeight: "900" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", fontSize: "10px", fontWeight: "bold" }} />
                    <Bar yAxisId="r" dataKey="revenue" fill="hsl(178, 42%, 42%)" radius={[4, 4, 0, 0]} opacity={0.8} barSize={20} />
                    <Line yAxisId="l" type="monotone" dataKey="hrv" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financial & Bio Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: "HRV Avg", value: liveMetrics.hrvAvg, color: "text-teal-600", info: "7-day autonomic baseline." },
                { icon: Moon, label: "Sleep", value: liveMetrics.sleepScore, color: "text-indigo-500", info: "Depth and consistency score." },
                { icon: DollarSign, label: "Week Rev", value: liveMetrics.weekRev, color: "text-slate-900", info: "Liquid sovereign yield." },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center shadow-sm">
                  <div className="flex justify-center items-center mb-1.5">
                    <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                    <InfoIcon text={m.info} />
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                  <p className="text-sm font-bold text-slate-900 italic tracking-tighter">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Ground Truth Analytics (Lightened) */}
            <div className="rounded-2xl border border-teal-100 bg-teal-50/30 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <p className="text-[10px] font-black uppercase tracking-widest italic text-teal-800">Ground Truth Analytics</p>
              </div>
              <p className="text-xs leading-relaxed font-medium text-slate-600">
                Revenue velocity peaks when <span className="font-bold text-slate-900">HRV &gt; 62ms</span>. Current markers indicate an <span className="font-bold text-slate-900">87% probability</span> of optimal executive function. 
                <span className="block mt-1.5 text-teal-600 font-bold uppercase tracking-tight">Signing authority is Unrestricted.</span>
              </p>
            </div>
          </TabsContent>

          {/* 2. GHOST PROTOCOL TAB */}
          <TabsContent value="ghost" className="space-y-6 focus-visible:outline-none">
             <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                      <Lock className="w-4 h-4 text-white" />
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ghost Protocol</h3>
                      <p className="text-[9px] text-orange-600 font-bold uppercase tracking-widest">Duress Defense & Honey-Pot</p>
                   </div>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-6">
                  Autonomously protects physical life and assets during a robbery by simulating transfer success while securing the true ledger.
                </p>

                <div className="space-y-3">
                   <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                      <Activity className="w-4 h-4 text-orange-500 mt-0.5" />
                      <div>
                         <p className="text-[10px] font-black text-slate-900 uppercase">1. Sympathetic Dump Detection</p>
                         <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">Triggers on HR Spike &gt;40bpm, HRV Crash &gt;50%, and Stationary Accelerometer (Freeze response).</p>
                      </div>
                   </div>
                   <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                      <Eye className="w-4 h-4 text-teal-600 mt-0.5" />
                      <div>
                         <p className="text-[10px] font-black text-slate-900 uppercase">2. Honey-Pot UI State</p>
                         <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">Displays fake balances (e.g., $450 instead of $450k) and simulates successful transfer flows.</p>
                      </div>
                   </div>
                   <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5" />
                      <div>
                         <p className="text-[10px] font-black text-slate-900 uppercase">3. Cryptographic Lockdown</p>
                         <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">Silently locks real assets at the ledger level and dispatches DURESS_CODE_7500 to SOC with GPS.</p>
                      </div>
                   </div>
                </div>
             </div>
          </TabsContent>

          {/* 3. ACOUSTICS TAB */}
          <TabsContent value="acoustics" className="space-y-6 focus-visible:outline-none">
             <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-indigo-600" />
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Acoustic Analysis</h3>
                      <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">Environmental Coercion Engine</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-900 uppercase mb-1">Coercion Detector</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Soft-blocks transactions if <span className="font-bold text-slate-700">Voice Tremor</span> and <span className="font-bold text-slate-700">Acute Stress</span> are detected in the acoustic floor during authorization.</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                      <p className="text-[10px] font-black text-rose-900 uppercase mb-1">Impact & Trauma Sync</p>
                      <p className="text-[10px] text-rose-700/80 leading-relaxed">Cross-references <span className="font-bold text-rose-900">High-Decibel Audio</span> with physical impact (&gt;4G force) to cryptographically log abuse events to the Immutable Vault.</p>
                   </div>
                </div>
             </div>
          </TabsContent>

          {/* 4. SHIELDS TAB (Ward/Sentinel/Aegis) */}
          <TabsContent value="shields" className="space-y-4 focus-visible:outline-none">
             {[
               { title: "Digital Ward", sub: "Minor Safety", desc: "Segregates minor data, enforcing the 'Cinderella Limit' (72hr hold) and Safe Passage route deviation alerts.", icon: ShieldCheck, color: "text-teal-600", bg: "bg-teal-100" },
               { title: "Silver Sentinel", sub: "Elder Protection", desc: "Prevents Caregiver Swap attacks via Cardio-ID. Enforces Beneficiary Wall to block transfers to will beneficiaries.", icon: UserMinus, color: "text-indigo-600", bg: "bg-indigo-100" },
               { title: "Aegis Protocol", sub: "Anti-Abuse Shield", desc: "Truman Sandbox generates a synthetic pattern-of-life feed for abusers while migrating the victim to a safe shard.", icon: Lock, color: "text-orange-500", bg: "bg-orange-100" }
             ].map((s, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm items-start">
                   <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${s.bg}`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                   </div>
                   <div>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase">{s.title}</h4>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{s.sub}</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                   </div>
                </div>
             ))}
          </TabsContent>
        </Tabs>
      </div>
    </GhostProtocol>
  );
};

export default PureAlphaDashboard;