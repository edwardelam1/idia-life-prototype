import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, Activity, TrendingUp, 
  Heart, Zap, AlertTriangle, Lock, Volume2, 
  Accessibility, Wind, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BioTetherLink from "./BioTetherLink";

interface StagedHealthData {
  heart_rate: number;
  heart_rate_variability_ms: number;
  respiratory_rate: number;
  blood_oxygen_saturation: number;
  walking_asymmetry_percentage: number;
  environmental_audio_exposure_db: number;
  body_temperature: number;
  data_quality_score: number;
  recorded_at: string;
}

interface BioMetrics {
  hr: number;
  hrv: number;
  resp: number;
  noise: number;
  asymmetry: number;
  hriScore: number;
  status: "CALIBRATING" | "ARMED" | "TRIGGERED";
}

const InfoIcon = ({ text }: { text: string }) => (
  <TooltipProvider>
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Info className="w-2.5 h-2.5 ml-1 inline-block opacity-40 hover:opacity-100 transition-opacity cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="bg-popover border-border text-[10px] max-w-[200px] leading-tight p-2 shadow-xl">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const HRIDashboard = ({ isMasked = false }: { isMasked?: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BioMetrics>({
    hr: 0, hrv: 0, resp: 0, noise: 0, asymmetry: 0, hriScore: 0, status: "CALIBRATING",
  });
  const [finance, setFinance] = useState({ weeklyEarnings: 0, burnoutStatus: "Sustainable" });

  useEffect(() => {
    if (isMasked) return;
    let isMounted = true;

    const initializeData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: txData } = await supabase
          .from("transactions")
          .select("amount, transaction_type")
          .eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo.toISOString());

        const earnings = (txData || [])
          .filter(tx => tx.transaction_type !== "payment_sent" && tx.amount > 0)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const { data: rawHealthData } = await (supabase
          .from("staged_health_data" as any)
          .select("heart_rate, heart_rate_variability_ms, respiratory_rate, environmental_audio_exposure_db, walking_asymmetry_percentage, data_quality_score")
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle() as any);

        const healthData = rawHealthData as StagedHealthData | null;

        if (isMounted) {
          const currentHRV = healthData?.heart_rate_variability_ms || 0;
          const currentHRI = healthData?.data_quality_score ? Math.round(healthData.data_quality_score * 100) : 0;
          
          setFinance({ 
            weeklyEarnings: earnings, 
            burnoutStatus: (earnings > 500 && currentHRI < 70) ? "High Risk" : (earnings > 200 && currentHRI < 80) ? "Caution" : "Sustainable" 
          });

          setMetrics({
            hr: healthData?.heart_rate || 0,
            hrv: currentHRV,
            resp: healthData?.respiratory_rate || 0,
            noise: healthData?.environmental_audio_exposure_db || 0,
            asymmetry: healthData?.walking_asymmetry_percentage || 0,
            hriScore: currentHRI,
            status: currentHRV > 0 ? "ARMED" : "CALIBRATING",
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard Stalling:", err);
        if (isMounted) setLoading(false);
      }
    };

    initializeData();

    const channel = supabase.channel("hri_live_tether").on("postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "staged_health_data" },
        (payload: any) => {
          const next = payload.new as StagedHealthData;
          if (next) {
            setMetrics((prev) => {
              const newHR = next.heart_rate || prev.hr;
              const newHRV = next.heart_rate_variability_ms || prev.hrv;
              const newNoise = next.environmental_audio_exposure_db || prev.noise;
              let newStatus = prev.status;
              if (newHR > 130 && newHRV < 20 && newNoise > 85) {
                newStatus = "TRIGGERED";
                toast({ title: "🚨 GHOST PROTOCOL ACTIVE", variant: "destructive", duration: 15000 });
              } else if (newStatus === "CALIBRATING" && newHR > 0) { newStatus = "ARMED"; }

              return {
                ...prev,
                hr: newHR, hrv: newHRV, noise: newNoise,
                resp: next.respiratory_rate || prev.resp,
                asymmetry: next.walking_asymmetry_percentage || prev.asymmetry,
                hriScore: next.data_quality_score ? Math.round(next.data_quality_score * 100) : prev.hriScore,
                status: newStatus,
              };
            });
          }
        }
      ).subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [isMasked]);

  const getStatusColor = () => {
    if (metrics.status === "TRIGGERED") return "text-red-500 bg-red-500/10 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]";
    if (metrics.status === "ARMED") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
    return "text-amber-500 bg-amber-500/10 border-amber-500/50";
  };

  if (loading && !isMasked) return <div className="p-8 text-center animate-pulse uppercase text-[10px] tracking-widest text-muted-foreground">Hydrating Pure Alpha...</div>;

  return (
    <div className={`p-4 pb-24 space-y-4 animate-fade-in bg-background min-h-screen ${isMasked ? "blur-[6px] opacity-40 pointer-events-none" : ""}`}>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[hsl(178,42%,42%)]" />
          <h2 className="font-bold text-sm uppercase tracking-tighter italic">IDIA PURE ALPHA</h2>
        </div>
        <Badge variant="outline" className={`text-[9px] uppercase font-black px-2 py-0.5 ${metrics.status === 'TRIGGERED' ? 'border-red-500 text-red-500 animate-pulse' : 'border-emerald-500 text-emerald-500'}`}>
          {metrics.status}
        </Badge>
      </div>

      <Card className={`border-2 transition-all duration-700 ${getStatusColor()}`}>
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 mb-4 bg-background shadow-inner">
            {metrics.status === "TRIGGERED" ? <Lock className="w-10 h-10" /> : <Activity className="w-10 h-10 animate-pulse" />}
          </div>
          <h3 className="font-black text-xl tracking-tighter uppercase italic">
            {metrics.status === "TRIGGERED" ? "Ghost Protocol" : "Keystone: Verified"}
          </h3>
          <p className="text-[9px] uppercase font-bold opacity-60 tracking-widest mt-1 flex items-center">
            Biometric Root of Trust 
            <InfoIcon text="The unforgeable link between your internal physiology and your digital assets." />
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/50">
  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
      Human Reliability Index
      <InfoIcon text="A fused score of biological and kinetic data identifying your current capacity for high-risk operations." />
    </CardTitle>
    <span className="text-3xl font-black italic">{metrics.hriScore}%</span>
  </CardHeader>
  <CardContent className="px-4 pb-4">
    <Progress 
      value={metrics.hriScore} 
      className="h-1.5" 
      // This prop now works because we hydrated the base component above
      indicatorClassName={
        metrics.hriScore < 70 
          ? "bg-red-500" 
          : metrics.hriScore < 85 
            ? "bg-amber-500" 
            : "bg-[hsl(178,42%,42%)]"
      } 
    />
  </CardContent>
</Card>

      <div className="grid grid-cols-2 gap-3">
        {/* HRV */}
        <Card className="p-3 space-y-1 bg-card/30 border-border/40">
          <div className="flex items-center gap-1.5 text-blue-500">
            <Activity className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">HRV Keystone</span>
            <InfoIcon text="Heart Rate Variability: Measures autonomic resilience. A sudden drop signals acute physiological stress." />
          </div>
          <p className="text-xl font-black tracking-tighter">{metrics.hrv}<span className="text-[10px] font-normal ml-1">ms</span></p>
        </Card>

        {/* Acoustic */}
        <Card className="p-3 space-y-1 bg-card/30 border-border/40">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Volume2 className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">Acoustic Floor</span>
            <InfoIcon text="Ambient noise monitoring used to confirm environmental threats like breaking glass or unrecognized voices." />
          </div>
          <p className="text-xl font-black tracking-tighter">{metrics.noise}<span className="text-[10px] font-normal ml-1">dB</span></p>
        </Card>

        {/* Resp */}
        <Card className="p-3 space-y-1 bg-card/30 border-border/40">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <Wind className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">Resp. Pattern</span>
            <InfoIcon text="Respiratory Rate: Tracks your breath frequency to distinguish between physical exertion and sympathetic panic." />
          </div>
          <p className="text-xl font-black tracking-tighter">{metrics.resp}<span className="text-[10px] font-normal ml-1">br/m</span></p>
        </Card>

        {/* Asymmetry */}
        <Card className="p-3 space-y-1 bg-card/30 border-border/40">
          <div className="flex items-center gap-1.5 text-rose-500">
            <Accessibility className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">Gait Analysis</span>
            <InfoIcon text="Measures the balance of your steps. Deviations detect fatigue or a physical proxy attempt by another person." />
          </div>
          <p className="text-xl font-black tracking-tighter">{metrics.asymmetry}%</p>
        </Card>
      </div>

      <Card className="bg-[hsl(178,42%,42%)] text-white border-none shadow-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Sovereign Yield</span>
            <p className="text-2xl font-black tracking-tighter">${finance.weeklyEarnings.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
              System State
              <InfoIcon text="Cross-referencing your financial output against your biological recovery to predict burnout." />
            </span>
            <p className="font-bold uppercase text-xs italic">{finance.burnoutStatus}</p>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
         <BioTetherLink isMasked={isMasked} />
      </div>
    </div>
  );
};

export default HRIDashboard;