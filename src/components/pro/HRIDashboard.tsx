import React, { useState, useEffect } from "react";
import { ShieldCheck, Activity, Volume2, Accessibility, Wind, Heart, Info } from "lucide-react";
import InsightsSection from "./insights/InsightsSection";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- TYPES ALIGNED TO SOVEREIGN SCHEMA ---
interface StagedHealthData {
  heart_rate: number;
  heart_rate_variability_ms: number;
  respiratory_rate: number;
  environmental_audio_exposure_db: number;
  walking_asymmetry_percentage: number;
  data_quality_score: number;
}

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

const HRIDashboard = ({ isMasked = false }: { isMasked?: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    hr: number | null;
    hrv: number | null;
    resp: number | null;
    noise: number | null;
    asymmetry: number | null;
    hriScore: number | null;
    alpha: string | null;
    status: "CALIBRATING" | "ARMED" | "TRIGGERED";
  }>({
    hr: null,
    hrv: null,
    resp: null,
    noise: null,
    asymmetry: null,
    hriScore: null,
    alpha: null,
    status: "CALIBRATING",
  });

  useEffect(() => {
    if (isMasked) return;
    let isMounted = true;

    // Latest non-null value per metric across the user's recent staged rows.
    const pick = (rows: any[], key: string): number | null => {
      for (const r of rows) {
        const v = r?.[key];
        if (typeof v === "number" && !Number.isNaN(v)) return v;
      }
      return null;
    };

    const fetchLatestMetrics = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data: rowsRaw, error } = await supabase
        .from("staged_health_data" as any)
        .select(
          "heart_rate, heart_rate_variability_ms, respiratory_rate, environmental_audio_exposure_db, walking_asymmetry_percentage, created_at",
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) console.error("[HRI][BIOMETRICS][FAIL]", error.message);
      const rows = (rowsRaw as any[]) || [];

      // Authoritative HRI score — edge function only. Never derived locally.
      let hriScore: number | null = null;
      let alpha: string | null = null;
      try {
        const { data: hri, error: hriErr } = await supabase.functions.invoke(
          "calculate-hri",
          { body: { user_id: uid } },
        );
        if (hriErr) throw hriErr;
        const raw = (hri as any)?.hri_raw;
        hriScore = typeof raw === "number" ? Math.round(raw) : null;
        alpha = (hri as any)?.hri_alpha ?? null;
      } catch (e: any) {
        console.error("[HRI][EDGE][FAIL]", e?.message ?? e);
      }

      if (!isMounted) return;
      const hr = pick(rows, "heart_rate");
      setMetrics({
        hr,
        hrv: pick(rows, "heart_rate_variability_ms"),
        resp: pick(rows, "respiratory_rate"),
        noise: pick(rows, "environmental_audio_exposure_db"),
        asymmetry: pick(rows, "walking_asymmetry_percentage"),
        hriScore,
        alpha,
        status: rows.length > 0 ? "ARMED" : "CALIBRATING",
      });
      setLoading(false);
    };

    fetchLatestMetrics();

    // Real-time Live Tether: refresh on new staged rows for this user.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid || !isMounted) return;
      channel = supabase
        .channel("hri_pro_stream")
        .on(
          "postgres_changes" as any,
          {
            event: "INSERT",
            schema: "public",
            table: "staged_health_data",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            fetchLatestMetrics();
          },
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isMasked]);

  const fmt = (v: number | null, unit: string) =>
    v === null ? "—" : `${v}${unit}`;

  const bioGrid = [
    { label: "Heart Rate", value: fmt(metrics.hr, " BPM"), icon: Heart, info: "Real-time cardiac frequency." },
    {
      label: "HRV Index",
      value: fmt(metrics.hrv, " ms"),
      icon: Activity,
      info: "Autonomic nervous system resilience baseline.",
    },
    {
      label: "Acoustic",
      value: fmt(metrics.noise, " dB"),
      icon: Volume2,
      info: "Ambient environmental stress monitoring.",
    },
    { label: "Respiratory", value: fmt(metrics.resp, " br/m"), icon: Wind, info: "Breathing frequency pattern." },
    {
      label: "Gait Balance",
      value: fmt(metrics.asymmetry, "%"),
      icon: Accessibility,
      info: "Kinetic walking symmetry percentage.",
    },
    {
      label: "HRI",
      value: metrics.hriScore === null ? "—" : `${metrics.hriScore}%`,
      icon: ShieldCheck,
      info: "Aggregated Human Reliability Index (HRI) score, computed server-side.",
    },
  ];


  if (loading && !isMasked) {
    return (
      <div className="p-8 text-center animate-pulse uppercase text-[10px] tracking-widest text-muted-foreground font-black">
        Hydrating IDIA Pro...
      </div>
    );
  }

  return (
    <div
      className={`p-4 pb-24 space-y-4 animate-fade-in bg-background min-h-screen ${isMasked ? "blur-md opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)] flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm uppercase">Occupational Performance</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Life Pro</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[8px] font-black uppercase px-2 py-0.5 ${metrics.status === "TRIGGERED" ? "border-red-500 text-red-500 animate-pulse" : "border-emerald-500 text-emerald-500"}`}
        >
          {metrics.status}
        </Badge>
      </div>

      <div className={`rounded-2xl border border-border bg-card shadow-sm p-4 transition-all`}>
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[hsl(28,80%,55%)]" />
          Occupational Biometrics
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {bioGrid.map((b) => (
            <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50">
              <div className="flex justify-center items-center mb-1">
                <b.icon className="w-3 h-3 text-[hsl(28,80%,55%)] opacity-70" />
                <InfoIcon text={b.info} />
              </div>
              <p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase tracking-tighter">{b.label}</p>
              <p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[hsl(28,80%,55%)] bg-[hsl(28,80%,55%)]/5 p-4 text-foreground shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[hsl(28,80%,55%)]" />
          <p className="text-[10px] font-black uppercase tracking-widest italic">System Integrity</p>
        </div>
        <p className="text-[11px] leading-snug font-medium opacity-90">
          Biological markers indicate a <span className="font-bold">{metrics.hriScore}% reliability rating</span>.
          Principal is currently operating at{" "}
          <span className="text-[hsl(28,80%,55%)] font-bold uppercase">Sustainable</span> capacity. No occupational
          drift detected.
        </p>
      </div>

      <InsightsSection tier="pro" isMasked={isMasked} />
    </div>
  );
};

export default HRIDashboard;
