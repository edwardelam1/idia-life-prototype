import { useState, useEffect, useCallback, useRef } from "react";
import { getCachedUser } from "@/lib/authUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Activity, Route, HeartPulse, Mountain, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { eventTracker } from "@/utils/EventTracker";
import { generateACAHash } from "@/utils/acaGenerator";
import { recordACA } from "@/utils/acaLedger";
import stravaLogoAsset from "@/assets/strava-logo.png.asset.json";

const stravaLogo = stravaLogoAsset.url;

interface StravaConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const StravaConnectionModal = ({
  isOpen,
  onClose,
  onComplete,
  existingConnection,
  onDisconnect,
}: StravaConnectionModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncSessionIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCloseRef.current = onClose;
    onCompleteRef.current = onComplete;
  }, [onClose, onComplete]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await getCachedUser();
      if (user && isMountedRef.current) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const clearAllTimers = useCallback(() => {
    if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    autoCloseTimeoutRef.current = null;
    connectionTimeoutRef.current = null;
  }, []);

  const closeAndReset = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      clearAllTimers();
      syncSessionIdRef.current = null;
      setIsConnecting(false);
      setConnected(false);
      onCloseRef.current?.();
    },
    [clearAllTimers],
  );

  useEffect(() => {
    if (!isOpen) closeAndReset();
  }, [isOpen, closeAndReset]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handleLedgerVerification = useCallback(() => {
    console.log(`[ACTION: React.Verification] Strava OAuth connection verified by ledger.`);
    clearAllTimers();
    setConnected(true);
    setIsConnecting(false);
    onCompleteRef.current?.();

    autoCloseTimeoutRef.current = setTimeout(() => {
      closeAndReset();
    }, 2000);
  }, [clearAllTimers, closeAndReset]);

  // ── Recovery net: Realtime + polling + deep-link event ──────────────
  useEffect(() => {
    if (!currentUserId || !syncSessionIdRef.current) return;
    const sessionId = syncSessionIdRef.current;

    console.log(`[BEGIN: React.RecoveryNet] Watchers armed for Strava session: ${sessionId}`);

    const verifyDatabaseRow = async () => {
      const { data } = await supabase
        .from("data_connections")
        .select("is_active")
        .eq("user_id", currentUserId)
        .eq("connection_type", "strava")
        .limit(1);

      if (data?.[0]?.is_active === true) {
        console.log("🔥 [ACTION: React.RecoveryNet] Ledger poll confirmed Strava sync!");
        handleLedgerVerification();
      }
    };

    const channel = supabase
      .channel(`strava_sync_watch_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_connections", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const newRow = payload.new as { connection_type?: string; is_active?: boolean } | null;
          if (newRow && newRow.connection_type === "strava" && newRow.is_active === true) {
            console.log("🔥 [ACTION: React.RecoveryNet] Realtime engine confirmed Strava sync!");
            handleLedgerVerification();
          }
        },
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (isMountedRef.current && syncSessionIdRef.current === sessionId) verifyDatabaseRow();
    }, 3000);

    const onReturned = () => {
      console.log("[ACTION: React.RecoveryNet] Strava deep-link return received — verifying.");
      verifyDatabaseRow();
    };
    window.addEventListener("strava:oauth-returned", onReturned);

    const onVisible = () => {
      if (document.visibilityState === "visible") verifyDatabaseRow();
    };
    document.addEventListener("visibilitychange", onVisible);

    verifyDatabaseRow();

    return () => {
      console.log(`[END: React.RecoveryNet] Watchers disarmed for Strava session: ${sessionId}`);
      clearInterval(pollInterval);
      window.removeEventListener("strava:oauth-returned", onReturned);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isConnecting, handleLedgerVerification]);

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUserId || !existingConnection) return;

    try {
      console.log("[BEGIN: React.HandleDisconnect] Revoking Strava connection non-destructively.");
      eventTracker.trackFeatureUsage({ feature: "strava_connection", action: "disconnect_initiated", success: false });

      const { hash, payload } = await generateACAHash(currentUserId, "strava_connection_revoke", [
        "DATA_CONNECTION_REVOKE",
        "ACTIVITY_TELEMETRY",
      ]);

      const { error } = await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("user_id", currentUserId)
        .eq("connection_type", "strava");

      if (error) throw error;

      await recordACA({
        userId: currentUserId,
        sourceId: "strava",
        consentType: "data_connection_revoke",
        hash,
        payload,
      });

      eventTracker.trackFeatureUsage({ feature: "strava_connection", action: "disconnected", success: true });
      onDisconnect?.();
      closeAndReset();
      toast({ title: "Disconnected", description: "Strava activity streaming has been revoked and recorded." });
      console.log("[END: React.HandleDisconnect] Revocation complete.");
    } catch (error: any) {
      console.error("Error disconnecting Strava:", error);
      if (!error?.message?.includes("cancelled")) {
        toast({
          title: "Disconnect Failed",
          description: error?.message || "Failed to disconnect",
          variant: "destructive",
        });
      }
    }
  };

  const handleConnect = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!currentUserId) {
        toast({ title: "Error", description: "Please log in to connect your Strava account.", variant: "destructive" });
        return;
      }

      eventTracker.trackFeatureUsage({ feature: "strava_connection", action: "connect_initiated", success: false });
      setIsConnecting(true);

      const sessionId = Math.random().toString(36).substring(7);
      syncSessionIdRef.current = sessionId;

      connectionTimeoutRef.current = setTimeout(() => {
        if (syncSessionIdRef.current === sessionId && isMountedRef.current) {
          toast({
            title: "Timeout",
            description: "Connection timed out at the biometric consent step. Please retry.",
            variant: "destructive",
          });
          setIsConnecting(false);
          clearAllTimers();
        }
      }, 45000);

      try {
        console.log(`[INFO: React.HandleConnect] Requesting biometric consent for fresh Strava ACA.`);
        const { hash, payload } = await generateACAHash(currentUserId, "strava_connection_auth", [
          "DATA_CONNECTION",
          "ACTIVITY_TELEMETRY",
          "OAUTH_AUTHORIZATION",
        ]);

        // Where Strava should send the person back to. Capacitor native uses the
        // idialife:// deep link; every other surface (web, custom iOS shell)
        // returns straight to the page they started from.
        let returnUrl: string | null = null;
        try {
          const { Capacitor } = await import("@capacitor/core");
          if (!Capacitor.isNativePlatform()) {
            returnUrl = `${window.location.origin}${window.location.pathname}`;
          }
        } catch {
          returnUrl = `${window.location.origin}${window.location.pathname}`;
        }

        const { data: urlData, error: urlError } = await supabase.functions.invoke("strava-controller", {
          body: { action: "get-auth-url", userId: currentUserId, returnUrl },
        });

        if (urlError) throw new Error(`Edge function error: ${urlError.message || "Unknown error"}`);
        if (urlData?.error) throw new Error(urlData.error);
        if (!urlData?.oauthUrl) throw new Error("No OAuth URL received from server");

        eventTracker.trackFeatureUsage({ feature: "strava_connection", action: "oauth_url_retrieved", success: true });

        await recordACA({
          userId: currentUserId,
          sourceId: "strava",
          consentType: "data_connection_auth",
          hash,
          payload,
        });

        // Strict select → insert/update (no upserts)
        console.log(`[BEGIN: React.HandleConnect.Seed] Validating data_connections row for Strava.`);
        const { data: seedRow, error: selectError } = await supabase
          .from("data_connections")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("connection_type", "strava")
          .limit(1);

        if (selectError) console.error("🚨 [ERROR: React.HandleConnect.Seed] Select query failed:", selectError);

        if (!seedRow || seedRow.length === 0) {
          const { error: insertError } = await supabase.from("data_connections").insert({
            user_id: currentUserId,
            connection_type: "strava",
            connection_name: "Strava",
            is_active: false,
          });
          if (insertError) console.error("🚨 [ERROR: React.HandleConnect.Seed] Insert failed:", insertError);
        } else {
          const { error: updateError } = await supabase
            .from("data_connections")
            .update({ is_active: false, connection_name: "Strava" })
            .eq("id", seedRow[0].id);
          if (updateError) console.error("🚨 [ERROR: React.HandleConnect.Seed] Update failed:", updateError);
        }

        if (syncSessionIdRef.current !== sessionId) return;

        clearAllTimers();
        connectionTimeoutRef.current = setTimeout(() => {
          if (syncSessionIdRef.current === sessionId && isMountedRef.current) {
            toast({
              title: "Timeout",
              description: "Connection timed out during the Strava login process. Please retry.",
              variant: "destructive",
            });
            setIsConnecting(false);
            clearAllTimers();
          }
        }, 300000);

        setTimeout(async () => {
          // Hand the login off to the system browser on native; Strava's login
          // page is unreliable inside embedded web views.
          try {
            const { Capacitor } = await import("@capacitor/core");
            if (Capacitor.isNativePlatform()) {
              const { Browser } = await import("@capacitor/browser");
              await Browser.open({ url: urlData.oauthUrl, presentationStyle: "popover" });
              return;
            }
          } catch (browserError) {
            console.error("[ERROR: React.HandleConnect] System browser handoff failed:", browserError);
          }
          window.location.href = urlData.oauthUrl;
        }, 800);
      } catch (error: any) {
        console.error("Error connecting Strava:", error);
        if (syncSessionIdRef.current !== sessionId) return;
        clearAllTimers();
        setIsConnecting(false);

        if (error?.message?.includes("cancelled") || error?.message?.includes("aborted")) {
          toast({ title: "Verification Cancelled", description: "Biometric authentication was cancelled." });
        } else {
          toast({
            title: "Connection Failed",
            description: `Failed to start Strava connection: ${error instanceof Error ? error.message : "Unknown error"}`,
            variant: "destructive",
          });
        }
      }
    },
    [currentUserId, clearAllTimers, toast],
  );

  const dataCategories = [
    { icon: Activity, label: "Activities & Workouts" },
    { icon: Route, label: "Route & Distance" },
    { icon: HeartPulse, label: "Pace & Heart Rate" },
    { icon: Mountain, label: "Elevation & Effort" },
  ];

  if (connected) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeAndReset();
        }}
      >
        <DialogContent className="max-w-sm text-center py-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Strava Linked!</h3>
          <p className="text-xs text-muted-foreground">Your activity data is now streaming into IDIA.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAndReset();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center space-x-2.5">
            <img src={stravaLogo} alt="Strava" className="h-6 w-auto object-contain" />
            <span>{existingConnection ? "Strava" : "Connect Strava"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          {existingConnection ? (
            <div className="space-y-3">
              <div className="text-center py-2">
                <img src={stravaLogo} alt="Strava" className="h-8 w-auto mx-auto mb-2 object-contain" />
                <h3 className="font-medium text-sm text-orange-800">Strava Active</h3>
                <p className="text-xs text-muted-foreground">Activity data is streaming</p>
              </div>

              <div className="bg-orange-50/70 p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-900">Live Activity Feed</p>
                  <p className="text-[11px] text-orange-700">Processing workouts automatically</p>
                </div>
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
              </div>

              <div className="flex space-x-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={closeAndReset}>
                  Close
                </Button>
                <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={handleDisconnect}>
                  <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Revoke
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-orange-50/80 p-2.5 rounded-lg border border-orange-100 text-xs text-orange-950 flex items-start space-x-2">
                <Zap className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="leading-snug">Stream your activity data anonymously into your vault.</p>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
                  Available data depends on what you record and share in your Strava account:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {dataCategories.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center space-x-2 p-1.5 rounded-md bg-muted/40 text-[11px] font-medium text-foreground"
                    >
                      <Icon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-tight">
                Routes are zone-hashed and no personal identification is ever shared.
              </p>

              <div className="flex space-x-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closeAndReset}
                  disabled={isConnecting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 mr-1.5" />
                      Verify &amp; Connect
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StravaConnectionModal;
