import { useState, useEffect, useCallback, useRef } from "react";
import { getCachedUser } from "@/lib/authUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Car, Zap, MapPin, Battery, Gauge, Shield, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { eventTracker } from "@/utils/EventTracker";
import { generateACAHash } from "@/utils/acaGenerator";
import { recordACA } from "@/utils/acaLedger";

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

  const closeAndReset = useCallback(() => {
    clearAllTimers();
    syncSessionIdRef.current = null;
    setIsConnecting(false);
    setConnected(false);
    onCloseRef.current?.();
  }, [clearAllTimers]);

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

  const handleDisconnect = async () => {
    if (!currentUserId || !existingConnection) return;

    try {
      eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "disconnect_initiated", success: false });

      const { hash, payload } = await generateACAHash(currentUserId, "ford_connection_revoke", [
        "DATA_CONNECTION_REVOKE",
        "VEHICLE_TELEMETRY",
      ]);

      const { error } = await supabase
        .from("data_connections")
        .delete()
        .eq("id", existingConnection.id)
        .eq("user_id", currentUserId);

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

  const handleConnect = useCallback(async () => {
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

      const { data: seedRow } = await supabase
        .from("data_connections")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("connection_type", "ford")
        .limit(1);

      if (!seedRow || seedRow.length === 0) {
        const { error: seedError } = await supabase.from("data_connections").insert({
          user_id: currentUserId,
          connection_type: "ford",
          connection_name: "FordConnect",
          is_active: false,
        });
        if (seedError) console.warn("🚨 [WARNING: React.HandleConnect] Seed insert failed:", seedError);
      } else {
        const { error: seedError } = await supabase
          .from("data_connections")
          .update({ is_active: false, connection_name: "FordConnect" })
          .eq("id", seedRow[0].id);
        if (seedError) console.warn("🚨 [WARNING: React.HandleConnect] Seed update failed:", seedError);
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

      // Native shell or blocked popup: navigate in place
      // Add a slight delay to allow Face ID modal to fully dismiss before ASWebAuthenticationSession slides up
      setTimeout(() => {
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
  }, [currentUserId, clearAllTimers]);

  const dataCategories = [
    { icon: MapPin, label: "Location & Movement", desc: "GPS, speed, heading" },
    { icon: Gauge, label: "Driving Dynamics", desc: "Pedals, acceleration, RPM" },
    { icon: Battery, label: "EV / Battery", desc: "SOC, charging, range" },
    { icon: Car, label: "Vehicle Health", desc: "Odometer, tires, DTCs" },
    { icon: Shield, label: "Security & Cabin", desc: "Doors, climate, alarm" },
  ];

  if (connected) {
    return (
      <Dialog open={isOpen} onOpenChange={closeAndReset}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">FordConnect Linked!</h3>
            <p className="text-muted-foreground mb-4">Your vehicle telemetry is now streaming into IDIA.</p>
            <p className="text-sm text-blue-600 font-medium">Earning potential: $40-80/month from vehicle data</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeAndReset}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span>{existingConnection ? "FordConnect" : "Connect FordConnect"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {existingConnection ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-blue-800">FordConnect Active</h3>
                <p className="text-sm text-muted-foreground">Vehicle telemetry is streaming</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Live Telemetry</p>
                    <p className="text-xs text-blue-600">Processing vehicle data automatically</p>
                  </div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={closeAndReset}>
                  Close
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                  <Fingerprint className="w-4 h-4 mr-2" /> Revoke
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Full Vehicle Telemetry</p>
                    <p className="text-sm text-blue-800">
                      Connect your Ford vehicle to stream real-time driving, location, EV, and diagnostic data — all
                      anonymized and earning you USDC.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-3">Data Categories</h4>
                <div className="space-y-2">
                  {dataCategories.map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
                      <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Privacy & Anonymization</h5>
                <p className="text-sm text-muted-foreground">
                  All vehicle data is anonymized before marketplace bundling. GPS positions are zone-hashed, VINs are
                  pseudonymized, and no personally identifiable information is ever shared.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={closeAndReset} disabled={isConnecting}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 mr-2" />
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
