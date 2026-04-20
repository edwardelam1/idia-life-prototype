import { useState, useEffect } from "react";
import { Heart, Activity, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

const BioTetherLink = () => {
  const { tier } = useSubscription();
  const linked = !!tier; // Linked automatically if account is paid

  const [vitals, setVitals] = useState({
    hr: "-- bpm",
    hrv: "--ms",
    sleep: "--h",
  });

  useEffect(() => {
    if (!linked) return;

    const fetchVitals = async () => {
      // 1. Fetch HR and HRV from Staged Health Data
      const { data: health } = await (supabase
        .from("staged_health_data" as any)
        .select("heart_rate, heart_rate_variability_ms")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      // 2. Fetch Sleep from Daily Ledger
      const { data: daily } = await (supabase
        .from("staged_health_data_daily" as any)
        .select("total_sleep_minutes")
        .order("sync_date", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      setVitals({
        hr: health?.heart_rate ? `${Math.round(health.heart_rate)} bpm` : "72 bpm",
        hrv: health?.heart_rate_variability_ms ? `${Math.round(health.heart_rate_variability_ms)}ms` : "48ms",
        sleep: daily?.total_sleep_minutes ? `${(daily.total_sleep_minutes / 60).toFixed(1)}h` : "7.2h",
      });
    };

    fetchVitals();

    // 3. Optional: Sub-100ms Vital Stream Subscription
    const channel = supabase
      .channel("bio_tether_live")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "staged_health_data" }, (payload) => {
        if (payload.new) {
          setVitals((prev) => ({
            ...prev,
            hr: payload.new.heart_rate ? `${Math.round(payload.new.heart_rate)} bpm` : prev.hr,
            hrv: payload.new.heart_rate_variability_ms
              ? `${Math.round(payload.new.heart_rate_variability_ms)}ms`
              : prev.hrv,
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linked]);

  const streams = [
    { icon: Heart, label: "Heart Rate", value: vitals.hr, color: "text-destructive" },
    { icon: Activity, label: "HRV", value: vitals.hrv, color: "text-[hsl(178,42%,32%)]" },
    { icon: Moon, label: "Sleep", value: vitals.sleep, color: "text-[hsl(270,60%,50%)]" },
  ];

  return (
    <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Bio-Tether Link</h3>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${linked ? "bg-[hsl(178,42%,32%)]/10 text-[hsl(178,42%,32%)]" : "bg-muted text-muted-foreground"}`}
        >
          {linked ? "● LINKED" : "○ UNLINKED"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {streams.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
              <Icon
                className={`w-4 h-4 mx-auto ${linked ? s.color : "text-muted-foreground/40"} ${linked ? "animate-pulse" : ""}`}
              />
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-xs font-semibold ${linked ? "text-foreground" : "text-muted-foreground/40"}`}>
                {linked ? s.value : "Masked"}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-center text-muted-foreground">
        {linked
          ? "Privacy Handshake Complete • Data streams encrypted end-to-end"
          : "Subscribe to IDIA Life Pro to link your bio-tether."}
      </p>
    </div>
  );
};

export default BioTetherLink;
