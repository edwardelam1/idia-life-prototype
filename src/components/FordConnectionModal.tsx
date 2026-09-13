import { useState, useEffect, useCallback, useRef } from "react";
import { getCachedUser } from "@/lib/authUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, MapPin, Battery, Gauge, Shield, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { eventTracker } from "@/utils/EventTracker";
import { generateACAHash } from "@/utils/acaGenerator";
import { recordACA } from "@/utils/acaLedger";
import fordLogo from "@/assets/ford-logo.png";

interface FordConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const FordConnectionModal = ({
  isOpen,
  onClose,
  onComplete,
  existingConnection,
  onDisconnect,
}: FordConnectionModalProps) => {
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
    console.log(`[ACTION: React.Verification] Ford OAuth connection verified by ledger.`);
    clearAllTimers();
    setConnected(true);
    setIsConnecting(false);
    onCompleteRef.current?.();

    autoCloseTimeoutRef.current = setTimeout(() => {
      closeAndReset();
    }, 2000);
  }, [clearAllTimers, closeAndReset]);

  useEffect(() => {
    if (!currentUserId || !syncSessionIdRef.current) return;
    const sessionId = syncSessionIdRef.current;

    console.log(`[BEGIN: React.RecoveryNet] Watchers armed for Ford session: ${sessionId}`);

    const verifyDatabaseRow = async () => {
      const { data } = await supabase
        .from("data_connections")
        .select("is_active")
        .eq("user_id", currentUserId)
        .eq("connection_type", "ford")
        .limit(1);

      if (data?.[0]?.is_active === true) {
        console.log("🔥 [ACTION: React.RecoveryNet] Ledger Poll confirmed Ford sync!");
        handleLedgerVerification();
      }
    };

    const channel = supabase
      .channel(`ford_sync_watch_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_connections", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const newRow = payload.new as { connection_type?: string; is_active?: boolean } | null;
          if (newRow && newRow.connection_type === "ford" && newRow.is_active === true) {
            console.log("🔥 [ACTION: React.RecoveryNet] Realtime Engine confirmed Ford sync!");
            handleLedgerVerification();
          }
        },
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (isMountedRef.current && syncSessionIdRef.current === sessionId) verifyDatabaseRow();
    }, 3500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") verifyDatabaseRow();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log(`[END: React.RecoveryNet] Teardown Ford watchers.`);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId, handleLedgerVerification]);

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUserId || !existingConnection) return;

    try {
      console.log("[BEGIN: React.HandleDisconnect] Revoking Ford connection non-destructively.");
      eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "disconnect_initiated", success: false });

      const { hash, payload } = await generateACAHash(currentUserId, "ford_connection_revoke", [
        "DATA_CONNECTION_REVOKE",
        "VEHICLE_TELEMETRY",
      ]);

      // 🚨 FIX: Replaced destructive .delete() with .update() to preserve the database entry
      const { error } = await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("user_id", currentUserId)
        .eq("connection_type", "ford");

      if (!error) {
        await recordACA({
          userId: currentUserId,
          sourceId: "ford",
          consentType: "data_connection_revoke",
          hash: hash,
          payload: payload,
        });

        eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "disconnected", success: true });
        onDisconnect?.();
        closeAndReset();
        toast({ title: "Disconnected", description: "FordConnect telemetry has been revoked and recorded." });
        console.log("[END: React.HandleDisconnect] Revocation complete.");
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error("Error disconnecting Ford:", error);
      if (!error.message?.includes("cancelled")) {
        toast({
          title: "Disconnect Failed",
          description: error.message || "Failed to disconnect",
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
        toast({ title: "Error", description: "Please log in to connect your Ford account.", variant: "destructive" });
        return;
      }

      eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "connect_initiated", success: false });
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
        console.log(`[INFO: React.HandleConnect] Requesting Face ID for fresh ACA.`);
        const { hash, payload } = await generateACAHash(currentUserId, "ford_connection_auth", [
          "DATA_CONNECTION",
          "VEHICLE_TELEMETRY",
          "OAUTH_AUTHORIZATION",
        ]);

        const { data: urlData, error: urlError } = await supabase.functions.invoke("ford-auth-url", {
          body: { userId: currentUserId },
        });

        if (urlError) throw new Error(`Edge function error: ${urlError.message || "Unknown error"}`);
        if (!urlData?.oauthUrl) throw new Error("No OAuth URL received from server");

        eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "oauth_url_retrieved", success: true });

        await recordACA({
          userId: currentUserId,
          sourceId: "ford",
          consentType: "data_connection_auth",
          hash: hash,
          payload: payload,
        });

        // 🚨 FIX: Strict Select -> Insert/Update flow (No Upserts)
        console.log(`[BEGIN: React.HandleConnect.Seed] Validating data_connections row for Ford.`);
        const { data: seedRow, error: selectError } = await supabase
          .from("data_connections")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("connection_type", "ford")
          .limit(1);

        if (selectError) {
          console.error("🚨 [ERROR: React.HandleConnect.Seed] Select query failed:", selectError);
        }

        if (!seedRow || seedRow.length === 0) {
          console.log(`[INFO: React.HandleConnect.Seed] No existing row found. Executing insert.`);
          const { error: insertError } = await supabase.from("data_connections").insert({
            user_id: currentUserId,
            connection_type: "ford",
            connection_name: "FordConnect",
            is_active: false,
          });
          if (insertError) console.error("🚨 [ERROR: React.HandleConnect.Seed] Insert failed:", insertError);
        } else {
          console.log(`[INFO: React.HandleConnect.Seed] Existing row found. Setting to inactive pending auth.`);
          const { error: updateError } = await supabase
            .from("data_connections")
            .update({ is_active: false, connection_name: "FordConnect" })
            .eq("id", seedRow[0].id);
          if (updateError) console.error("🚨 [ERROR: React.HandleConnect.Seed] Update failed:", updateError);
        }

        if (syncSessionIdRef.current !== sessionId) return;

        clearAllTimers();
        connectionTimeoutRef.current = setTimeout(() => {
          if (syncSessionIdRef.current === sessionId && isMountedRef.current) {
            toast({
              title: "Timeout",
              description: "Connection timed out during the Ford login process. Please retry.",
              variant: "destructive",
            });
            setIsConnecting(false);
            clearAllTimers();
          }
        }, 300000);

        setTimeout(async () => {
          // Ford's identity provider refuses embedded web views and bounces straight
          // back without ever showing its sign-in page. On device we must hand the
          // login off to the system browser (SFSafariViewController / Custom Tabs).
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
        console.error("Error connecting Ford:", error);
        if (syncSessionIdRef.current !== sessionId) return;
        clearAllTimers();
        setIsConnecting(false);

        if (error.message?.includes("cancelled") || error.message?.includes("aborted")) {
          toast({ title: "Verification Cancelled", description: "Biometric authentication was cancelled." });
        } else {
          toast({
            title: "Connection Failed",
            description: `Failed to start Ford connection: ${error instanceof Error ? error.message : "Unknown error"}`,
            variant: "destructive",
          });
        }
      }
    },
    [currentUserId, clearAllTimers, toast],
  );

  const dataCategories = [
    { icon: MapPin, label: "Location & Movement" },
    { icon: Gauge, label: "Driving Dynamics" },
    { icon: Battery, label: "EV & Battery Level" },
    { icon: Shield, label: "Vehicle Health & Security" },
  ];

  if (connected) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAndReset(); }}>
        <DialogContent className="max-w-sm text-center py-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">FordConnect Linked!</h3>
          <p className="text-xs text-muted-foreground">Your vehicle telemetry is now streaming into IDIA.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAndReset(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center space-x-2.5">
            <img src={fordLogo} alt="Ford" className="h-6 w-auto object-contain" />
            <span>{existingConnection ? "FordConnect" : "Connect FordConnect"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          {existingConnection ? (
            <div className="space-y-3">
              <div className="text-center py-2">
                <img src={fordLogo} alt="Ford" className="h-8 w-auto mx-auto mb-2 object-contain" />
                <h3 className="font-medium text-sm text-blue-800">FordConnect Active</h3>
                <p className="text-xs text-muted-foreground">Vehicle telemetry is streaming</p>
              </div>

              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-900">Live Telemetry</p>
                  <p className="text-[11px] text-blue-700">Processing vehicle data automatically</p>
                </div>
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
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
              <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-100 text-xs text-blue-950 flex items-start space-x-2">
                <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-snug">Stream vehicle data anonymously into your vault.</p>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
                  Available telemetry depends on the connectivity and data-sharing features enabled in your Ford vehicle
                  and FordPass account settings:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {dataCategories.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center space-x-2 p-1.5 rounded-md bg-muted/40 text-[11px] font-medium text-foreground"
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-tight">
                GPS data is zone-hashed, VINs are pseudonymized, and no personal identification is ever shared.
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                      Verify & Connect
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

export default FordConnectionModal;
