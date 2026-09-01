import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = "https://auth.thebigidia.com/functions/v1";

/**
 * Silently pushes a FRESH Supabase session token into the iOS native layer on
 * launch and whenever the token rotates. Without this, the shell keeps using a
 * stale JWT from UserDefaults and background HealthKit payloads are dropped,
 * leaving the Apple Health modal permanently stale.
 *
 * No-ops on web (no webkit bridge) and when Apple Health isn't connected.
 */
export const useHealthKitHydrator = () => {
  const inFlightRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hydrateNativeLayer = async () => {
      const webkit = (window as any).webkit;
      if (!webkit?.messageHandlers?.syncHealthData) return; // web / non-shell
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !session.access_token) return;
        if (lastTokenRef.current === session.access_token) return; // already pushed
        const userId = session.user.id;

        // 1. Apple Health must be actively connected
        const { data: connection } = await supabase
          .from("data_connections")
          .select("is_active")
          .eq("user_id", userId)
          .eq("connection_type", "apple_health")
          .maybeSingle();
        if (!connection?.is_active) return;

        // 2. Resolve the platform GUID used to anchor ACA records
        const { data: profile } = await supabase
          .from("profiles")
          .select("platform_guid")
          .eq("user_id", userId)
          .maybeSingle();
        const platformGuid = (profile as any)?.platform_guid || userId;

        // 3. Retrieve the locked ACA hash for the Apple Health source
        const { data: acaRecord } = await supabase
          .from("user_aca_records")
          .select("aca_hash_key")
          .eq("source_id", "apple_health")
          .eq("platform_guid", platformGuid)
          .maybeSingle();
        const acaHash = (acaRecord as any)?.aca_hash_key;
        if (!acaHash) return;

        console.log("🍏 [HealthHydrator] Pushing fresh session token to iOS native layer...");
        webkit.messageHandlers.syncHealthData.postMessage({
          action: "comprehensive_health_sync",
          endpoint: `${FUNCTIONS_BASE}/apple-health-sync?aca_hash_key=${acaHash}`,
          user_id: userId,
          auth_token: session.access_token,
          aca_hash_key: acaHash,
          sync_session_id: `launch_sync_${Math.random().toString(36).substring(7)}`,
          requestedDataTypes: {},
        });
        lastTokenRef.current = session.access_token;
      } catch (e) {
        console.error("🚨 [HealthHydrator] Failed to hydrate native layer:", e);
      } finally {
        inFlightRef.current = false;
      }
    };

    // Cold boot: give the Supabase session a beat to mount
    const bootTimer = setTimeout(hydrateNativeLayer, 1000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        hydrateNativeLayer();
      }
      if (event === "SIGNED_OUT") lastTokenRef.current = null;
    });

    return () => {
      clearTimeout(bootTimer);
      subscription.unsubscribe();
    };
  }, []);
};

export default useHealthKitHydrator;
