import { useState, useEffect, ReactNode } from 'react';
import { getCachedUser } from "@/lib/authUser";
import { Shield, TrendingUp, Activity, Lock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GhostProtocolProps {
  children: ReactNode;
}

interface TelemetryDetail {
  accel: { x: number; y: number; z: number };
  ts: number;
}

const GhostProtocol = ({ children }: GhostProtocolProps) => {
  const [duressDetected, setDuressDetected] = useState(false);
  const [isStationary, setIsStationary] = useState(true);
  const [baselineHR, setBaselineHR] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Kinetic Monitoring: Wide-Open Native Pipe
    const handleTelemetry = (event: any) => {
      const detail = event.detail as TelemetryDetail;
      const magnitude = Math.sqrt(
        Math.pow(detail.accel.x, 2) + 
        Math.pow(detail.accel.y, 2) + 
        Math.pow(detail.accel.z, 2)
      );
      
      // REQ-AUTH-7.3.1: Detect absolute stationary (Freeze response)
      setIsStationary(magnitude < 0.02);
    };

    window.addEventListener('idia:telemetry', handleTelemetry);

    // 2. Keystone Monitoring: Living Biometric Stream
    const channel = supabase
      .channel("ghost_duress_monitor")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "staged_health_data" },
        (payload: any) => {
          const next = payload.new;
          if (!next) return;

          if (baselineHR === null && next.heart_rate) {
            setBaselineHR(next.heart_rate);
            return;
          }

          const hrDelta = next.heart_rate - (baselineHR || 0);
          const hrv = next.heart_rate_variability_ms;

          // REQ-AUTH-7.3.1: Tri-Factor Trigger
          if (hrDelta > 40 && hrv < 20 && isStationary) {
            if (isMounted) {
              console.log("🚨 [GHOST_PROTOCOL] START: Duress Sequence Initiated.");
              setDuressDetected(true);
              dispatchSilentAlarm(next.recorded_at);
              console.log("🚨 [GHOST_PROTOCOL] END: Vault Locked. Honey-Pot Active.");
            }
          }
        }
      )
      .subscribe();

    const dispatchSilentAlarm = async (timestamp: string) => {
      console.log("🛰️ [SOC_ALARM] START: Dispatching DURESS_CODE_7500.");
      
      try {
        const { data: { user } } = await getCachedUser();
        if (!user) {
            console.log("🚨 [SOC_ALARM] ABORT: No authenticated principal found.");
            return;
        }

        // --- OVERRIDE: Using 'as any' to bypass the missing taxonomy definitions ---
        const { error } = await (supabase.from("security_logs" as any).insert({
          user_id: user.id,
          event_code: "7500",
          severity: "CRITICAL",
          metadata: { 
            trigger: "BIOMETRIC_KINETIC_FUSION",
            timestamp,
            status: "VAULT_ENCRYPTED_HONEYPOT_ACTIVE",
            telemetry_state: isStationary ? "STASIS" : "KINETIC"
          }
        }) as any);

        if (error) {
            console.log(`🚨 [SOC_ALARM] ERROR: Database rejection: ${error.message}`);
        } else {
            console.log("🛰️ [SOC_ALARM] SUCCESS: Alarm acknowledged by Hub.");
        }
      } catch (err) {
        console.log(`🚨 [SOC_ALARM] FATAL: System failure during egress: ${err}`);
      }
      
      console.log("🛰️ [SOC_ALARM] END: Silent dispatch sequence complete.");
    };

    return () => {
      isMounted = false;
      window.removeEventListener('idia:telemetry', handleTelemetry);
      supabase.removeChannel(channel);
    };
  }, [baselineHR, isStationary]);

  // REQ-AUTH-7.3.2 & 7.3.3: Tactical Honey-Pot UI
  if (duressDetected) {
    return (
      <div className="flex flex-col space-y-5 bg-background min-h-screen p-4 pb-24 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] flex items-center justify-center shadow-sm">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-black text-foreground text-sm uppercase tracking-tight">HealthStream</h2>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Standard Account</p>
            </div>
          </div>
          <div className="px-2 py-0.5 rounded-full border border-border">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status: Online</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60 mb-1">Available Credits</p>
          <h3 className="text-4xl font-black">$42.15</h3>
          <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-teal-50">Standard · Synced</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Activity Level</p>
            <p className="text-lg font-black text-foreground">Optimal</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
            <Shield className="w-4 h-4 text-[hsl(178,42%,32%)]" />
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Device Sync</p>
            <p className="text-lg font-black text-foreground">Secure</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center justify-center">
            <Activity className="w-6 h-6 text-muted-foreground/60 mb-2" />
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Awaiting biological sync...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GhostProtocol;