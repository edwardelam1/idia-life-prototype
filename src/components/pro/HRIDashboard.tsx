import React, { useState, useEffect } from "react";
import { ShieldCheck, Activity, Volume2, Accessibility, Wind, Heart, Info } from "lucide-react";
import InsightsSection from "./insights/InsightsSection";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      className={`flex flex-col space-y-5 bg-background min-h-screen p-4 pb-24 overflow-x-hidden animate-in fade-in duration-700 ${isMasked ? "blur-md opacity-40" : ""}`}
    >
      {/* HERO — Gov style */}
      <Card className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden shrink-0">
        <CardContent className="p-7">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60">
                Occupational Performance
              </p>
              <h1 className="text-4xl font-black truncate">
                {metrics.hriScore === null || isMasked ? "—" : metrics.hriScore}
                <span className="text-sm font-medium text-teal-100/40"> HRI</span>
              </h1>
            </div>
            <ShieldCheck className="w-10 h-10 text-orange-400 drop-shadow-lg shrink-0" />
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${metrics.status === "TRIGGERED" ? "bg-red-400 animate-pulse" : metrics.status === "ARMED" ? "bg-emerald-400 animate-pulse" : "bg-orange-400"}`}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-teal-50 truncate">
              Life Pro · {metrics.status}
              {metrics.alpha ? ` · Alpha ${metrics.alpha}` : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
          <Activity size={14} className="text-orange-500" /> Occupational Biometrics
        </h2>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {bioGrid.map((b) => (
                <div key={b.label} className="rounded-xl bg-muted/30 p-2.5 text-center border border-border/50">
                  <div className="flex justify-center items-center mb-1">
                    <b.icon className="w-3 h-3 text-[hsl(178,42%,32%)] opacity-70" />
                    <InfoIcon text={b.info} />
                  </div>
                  <p className="text-[9px] font-black text-muted-foreground mb-1 uppercase tracking-widest">
                    {b.label}
                  </p>
                  <p className="text-xs font-black text-foreground">{isMasked ? "—" : b.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>


      <div className="rounded-2xl border-2 border-[hsl(178,42%,32%)] bg-[hsl(178,42%,32%)]/5 p-4 text-foreground shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[hsl(178,42%,32%)]" />
          <p className="text-[10px] font-black uppercase tracking-widest italic">System Integrity</p>
        </div>
        <p className="text-[11px] leading-snug font-medium opacity-90">
          {metrics.hriScore === null ? (
            <>Reliability rating unavailable — the HRI service has not returned a score yet.</>
          ) : (
            <>
              Server-computed reliability rating:{" "}
              <span className="font-bold">{metrics.hriScore}%</span>
              {metrics.alpha ? (
                <>
                  {" "}
                  · Alpha class{" "}
                  <span className="text-[hsl(178,42%,32%)] font-bold uppercase">
                    {metrics.alpha}
                  </span>
                </>
              ) : null}
              .
            </>
          )}
        </p>

      </div>

      <InsightsSection tier="pro" isMasked={isMasked} />
    </div>
  );
};

export default HRIDashboard;
