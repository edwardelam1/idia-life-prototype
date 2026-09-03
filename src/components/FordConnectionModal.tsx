import { useState, useEffect, useRef } from "react";
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const stopWatching = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (watchTimeoutRef.current) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await getCachedUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
    return () => stopWatching();
  }, []);

  // Returning from the system browser after Ford login is the moment the
  // callback has stamped the connection — re-check immediately.
  useEffect(() => {
    if (!isConnecting) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") checkConnection();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isConnecting, currentUserId]);

  useEffect(() => {
    if (!isOpen) {
      stopWatching();
      setIsConnecting(false);
    }
  }, [isOpen]);


  const handleDisconnect = async () => {
    if (!currentUserId || !existingConnection) return;

    try {
      eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "disconnect_initiated", success: false });

      // Trigger ACA Hash for revocation
      const { hash, payload } = await generateACAHash(currentUserId, "ford_connection_revoke", [
        "DATA_CONNECTION_REVOKE",
        "VEHICLE_TELEMETRY",
      ]);

      const { error } = await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("id", existingConnection.id)
        .eq("user_id", currentUserId);

      if (!error) {
        // Record the immutable cryptographic ledger entry
        await recordACA({
          userId: currentUserId,
          sourceId: "ford",
          consentType: "data_connection_revoke",
          hash: hash,
          payload: payload,
        });

        eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "disconnected", success: true });
        onDisconnect?.();
        onClose();
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

  /**
   * Inside the iOS WKWebView shell `window.open` yields a blank child view that cannot
   * follow Ford's cross-origin redirect (the "white screen"). Detect the shell and hand
   * the OAuth URL to the native external-browser bridge instead.
   */
  const nativeOpen = (url: string): boolean => {
    const handlers = (window as any).webkit?.messageHandlers;
    const handler = handlers?.openExternalUrl || handlers?.openExternalHub;
    if (!handler) return false;
    try {
      handler.postMessage({ url });
      return true;
    } catch (e) {
      console.error("[FORD] native open bridge failed", e);
      return false;
    }
  };

  /** Poll the ledger until the OAuth callback stamps an active Ford connection. */
  const watchForConnection = (timeoutMs = 300000) => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (watchTimeoutRef.current) clearTimeout(watchTimeoutRef.current);

    pollRef.current = setInterval(() => {
      checkConnection();
    }, 3000);

    watchTimeoutRef.current = setTimeout(() => {
      stopWatching();
      setIsConnecting(false);
      toast({
        title: "Connection Timeout",
        description: "We never heard back from Ford. Please try again.",
        variant: "destructive",
      });
    }, timeoutMs);
  };

  const handleConnect = async () => {
    if (!currentUserId) {
      toast({ title: "Error", description: "Please log in to connect your Ford account.", variant: "destructive" });
      return;
    }

    eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "connect_initiated", success: false });
    setIsConnecting(true);

    const isNativeShell = !!(window as any).webkit?.messageHandlers?.triggerBiologicalCapture;

    // On web only: open the popup synchronously so the browser does not block it.
    let popup: Window | null = null;
    if (!isNativeShell) {
      popup = window.open("about:blank", "ford-oauth", "width=600,height=700,scrollbars=yes,resizable=yes");
      if (popup) {
        popup.document.write(`
        <html>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;color:#1e293b;text-align:center;padding:2rem;">
            <h2 style="margin:0 0 0.5rem 0;">Awaiting Biometrics...</h2>
            <p style="color:#64748b;margin:0;">Please confirm via Face ID / Touch ID on your device.</p>
          </body>
        </html>
      `);
      }
    }

    try {
      // 1. Trigger Biometric Hardware (Face ID / Fingerprint) to generate ACA Hash
      const { hash, payload } = await generateACAHash(currentUserId, "ford_connection_auth", [
        "DATA_CONNECTION",
        "VEHICLE_TELEMETRY",
        "OAUTH_AUTHORIZATION",
      ]);

      // 2. Fetch specific OAuth URL from Edge Function
      const { data: urlData, error: urlError } = await supabase.functions.invoke("ford-auth-url", {
        body: { userId: currentUserId },
      });

      if (urlError) throw new Error(`Edge function error: ${urlError.message || "Unknown error"}`);
      if (!urlData?.oauthUrl) throw new Error("No OAuth URL received from server");

      eventTracker.trackFeatureUsage({ feature: "ford_connection", action: "oauth_url_retrieved", success: true });

      // 3. Anchor the ACA Hash to the Immutable Ledger
      await recordACA({
        userId: currentUserId,
        sourceId: "ford",
        consentType: "data_connection_auth",
        hash,
        payload,
      });

      // 4. Native shell → system browser; web → popup.
      if (isNativeShell) {
        const opened = nativeOpen(urlData.oauthUrl);
        if (!opened) {
          // Last resort inside the shell: navigate this view to Ford so the user never
          // lands on a blank window. The callback deep-links back into the app.
          window.location.href = urlData.oauthUrl;
          return;
        }
        toast({
          title: "Ford login opened",
          description: "Finish signing in with Ford, then return to IDIA — we'll link it automatically.",
        });
        watchForConnection();
        return;
      }

      if (!popup || popup.closed) {
        setIsConnecting(false);
        const useDirectLink = confirm("Your browser blocked the popup. Open Ford login in this window instead?");
        if (useDirectLink) window.location.href = urlData.oauthUrl;
        return;
      }

      popup.location.href = urlData.oauthUrl;
      watchForConnection();
    } catch (error: any) {
      console.error("Error connecting Ford:", error);
      if (popup && !popup.closed) popup.close();
      stopWatching();
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
  };


  const checkConnection = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from("data_connections")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("connection_type", "ford")
        .eq("is_active", true)
        .maybeSingle();

      if (data && !error) {
        stopWatching();
        setIsConnecting(false);
        setConnected(true);
        toast({ title: "Connected!", description: "Your Ford vehicle has been connected successfully." });
        setTimeout(() => {
          onComplete();
          setConnected(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking Ford connection:", error);
    }
  };

  const dataCategories = [
    { icon: MapPin, label: "Location & Movement", desc: "GPS, speed, heading" },
    { icon: Gauge, label: "Driving Dynamics", desc: "Pedals, acceleration, RPM" },
    { icon: Battery, label: "EV / Battery", desc: "SOC, charging, range" },
    { icon: Car, label: "Vehicle Health", desc: "Odometer, tires, DTCs" },
    { icon: Shield, label: "Security & Cabin", desc: "Doors, climate, alarm" },
  ];

  if (connected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                <Button variant="outline" className="flex-1" onClick={onClose}>
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
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={isConnecting}>
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
