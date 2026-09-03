import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Footprints, Zap, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { generateACAHash } from "@/utils/acaGenerator";
import { fireAppleHealthDataBurst } from "@/components/psychometric/confetti";

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const ALL_HEALTH_DATA_TYPES = [
  // --- CORE ACTIVITY ---
  { id: "HKQuantityTypeIdentifierStepCount", name: "Steps", category: "Activity" },
  { id: "HKQuantityTypeIdentifierActiveEnergyBurned", name: "Active Energy Burned", category: "Activity" },

  // --- KEYSTONE VITALS (PURE ALPHA) ---
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", name: "Heart Rate Variability", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", name: "Respiratory Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", name: "Blood Oxygen", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierBodyTemperature", name: "Body Temperature", category: "Vitals" },

  // --- KINETIC TELEMETRY (GAIT & MOBILITY) ---
  { id: "HKQuantityTypeIdentifierWalkingAsymmetryPercentage", name: "Gait Asymmetry", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierWalkingDoubleSupportPercentage", name: "Double Support", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierWalkingSpeed", name: "Walking Speed", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierWalkingStepLength", name: "Step Length", category: "Mobility" },

  // --- ENVIRONMENTAL AWARENESS ---
  { id: "HKQuantityTypeIdentifierEnvironmentalAudioExposure", name: "Acoustic Floor (dB)", category: "Environment" },
  { id: "HKQuantityTypeIdentifierUVExposure", name: "UV Exposure", category: "Environment" },

  // --- SLEEP PROTOCOL ---
  { id: "HKCategoryTypeIdentifierSleepAnalysis", name: "Sleep Analysis", category: "Vitals" },
];

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const [connectedThisSession, setConnectedThisSession] = useState(false);

  const bridgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncSessionIdRef = useRef<string | null>(null);
  const syncStartedAtRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);
  const appleHealthIconRef = useRef<HTMLImageElement | null>(null);
  const burstTriggeredRef = useRef(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isMountedRef.current) {
        setCurrentUserId(session.user.id);
        setAuthSession(session);
      }
    });
  }, []);

  // NOTE: No client-side network polling or Realtime watchers. The Swift master owns
  // the egress; completion is signalled exclusively via window.onHealthDataSync* callbacks.




  const clearAllTimers = useCallback(() => {
    if (bridgeTimeoutRef.current) {
      clearTimeout(bridgeTimeoutRef.current);
      bridgeTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, []);

  const detachNativeCallbacks = useCallback(() => {
    if ((window as any).onHealthDataSyncComplete) {
      (window as any).onHealthDataSyncComplete = undefined;
    }
    if ((window as any).onHealthDataSyncError) {
      (window as any).onHealthDataSyncError = undefined;
    }
  }, []);

  const closeAndReset = useCallback(() => {
    clearAllTimers();
    syncSessionIdRef.current = null;
    detachNativeCallbacks();
    setIsConnecting(false);
    setConnectionStatus("idle");
    setErrorMessage(null);
    setHealthData(null);
    setSyncCount(0);
    setConnectedThisSession(false);
    onCloseRef.current?.();
  }, [clearAllTimers, detachNativeCallbacks]);

  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      syncSessionIdRef.current = null;
      detachNativeCallbacks();
      burstTriggeredRef.current = false;
      setIsConnecting(false);
      setConnectionStatus("idle");
      setErrorMessage(null);
      setHealthData(null);
      setSyncCount(0);
      setConnectedThisSession(false);
    }
  }, [isOpen, clearAllTimers, detachNativeCallbacks]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      detachNativeCallbacks();
    };
  }, [clearAllTimers, detachNativeCallbacks]);

  useEffect(() => {
    if (connectionStatus !== "connected" || burstTriggeredRef.current) return;

    const rect = appleHealthIconRef.current?.getBoundingClientRect();
    if (rect) {
      fireAppleHealthDataBurst({
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      });
      burstTriggeredRef.current = true;
    }
  }, [connectionStatus]);

  const syncHealthDataViaNativeApp = useCallback(
    (hash: string, sessionId: string) => {
      console.log("--- BEGIN ERROR HANDLING: Lovable Sync Trigger ---");
      console.log("🚨 [FRONTEND_INIT][BEGIN: Planck.Lovable.TriggerSync] Attempting to invoke native Swift bridge.");

      // Swift Master Callbacks — the ONLY authority on sync completion.
      (window as any).onHealthDataSyncComplete = (result: any) => {
        console.log("--- BEGIN ERROR HANDLING: Swift Callback Success ---");
        console.log("🚨 [FRONTEND_CALLBACK_SUCCESS][BEGIN: Planck.Lovable.Callback] Swift reported successful egress.");
        console.log(
          "🚨 [FRONTEND_CALLBACK_SUCCESS][END: Planck.Lovable.Callback] -> Sync complete. Processed: " +
            (result?.processed_count ?? 0) +
            ". Releasing UI loading state.",
        );
        console.log("--- END ERROR HANDLING: Swift Callback Success ---");

        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        clearAllTimers();
        setSyncCount(result?.processed_count ?? 0);
        setHealthData({ steps: "Verified", heartRate: "Verified" });
        setConnectionStatus("connected");
        setConnectedThisSession(true);
        setIsConnecting(false);
        onCompleteRef.current?.();
        autoCloseTimeoutRef.current = setTimeout(() => closeAndReset(), 3000);
      };

      (window as any).onHealthDataSyncError = (errorMsg: string, _sessionIdFromSwift?: string) => {
        console.log("--- BEGIN ERROR HANDLING: Swift Callback Error ---");
        console.log("🚨 [FRONTEND_CALLBACK_ERROR][FATAL: Planck.Lovable.Callback] Swift reported error: " + errorMsg);
        console.log(
          "🚨 [FRONTEND_CALLBACK_ERROR][END: Planck.Lovable.Callback] -> Silent stalling prevented: Releasing UI loading state to show error.",
        );
        console.log("--- END ERROR HANDLING: Swift Callback Error ---");

        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        if (connectedThisSession) return;
        clearAllTimers();
        setErrorMessage(`Sync Error: ${errorMsg}`);
        setConnectionStatus("error");
        setIsConnecting(false);
      };

      const webkit = (window as any).webkit;
      if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
        webkit.messageHandlers.syncHealthData.postMessage({
          user_id: currentUserId,
          aca_hash_key: hash,
          auth_token: authSession?.access_token,
          sync_session_id: sessionId,
        });
        console.log(
          "🚨 [FRONTEND_SUCCESS][END: Planck.Lovable.TriggerSync] -> Payload handed off to Swift master. UI should remain in loading state.",
        );
        console.log("--- END ERROR HANDLING: Lovable Sync Trigger ---");

        // 🛑 WATCHDOG: Swift owns the egress, but a silent native failure must never hang the UI.
        if (bridgeTimeoutRef.current) clearTimeout(bridgeTimeoutRef.current);
        bridgeTimeoutRef.current = setTimeout(() => {
          if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
          setConnectionStatus((prev) => {
            if (prev === "connected") return prev;
            setErrorMessage(
              "Native shell did not respond within 75 seconds. Open Settings → Privacy → Health → IDIA and allow all categories, then try again.",
            );
            setIsConnecting(false);
            return "error";
          });
        }, 75000);
        return;
      }

      console.log("🚨 [FRONTEND_FATAL][FATAL: Planck.Lovable.TriggerSync] Native bridge 'syncHealthData' not found.");
      console.log(
        "🚨 [FRONTEND_FATAL][END: Planck.Lovable.TriggerSync] -> Silent stalling occurs: App is not running in native shell. Releasing UI loading state.",
      );
      console.log("--- END ERROR HANDLING: Lovable Sync Trigger ---");
      clearAllTimers();
      setErrorMessage("Please launch from the IDIA iOS App.");
      setConnectionStatus("error");
      setIsConnecting(false);
    },
    [currentUserId, authSession, connectedThisSession, clearAllTimers, closeAndReset],
  );



  const handleConnect = useCallback(async () => {
    setErrorMessage(null);
    setIsConnecting(true);
    setConnectionStatus("connecting");

    const sessionId = Math.random().toString(36).substring(7);
    syncSessionIdRef.current = sessionId;
    syncStartedAtRef.current = new Date(Date.now() - 5000).toISOString();

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .limit(1);

      const platformGuid = profile?.[0]?.platform_guid || currentUserId;
      if (!platformGuid) throw new Error("Profile anchor missing.");

      const { hash, payload } = await generateACAHash(platformGuid, "apple_health", ["KYC_VAULT", "HEALTH_DATA_READ"]);

      const { error: acaError } = await supabase.from("user_aca_records").upsert(
        {
          platform_guid: platformGuid,
          aca_hash_key: hash,
          source_id: "apple_health",
          consent_scope: payload?.consent_scope || ["HEALTH_DATA_READ"],
        },
        { onConflict: "aca_hash_key" },
      );

      if (acaError) {
        throw new Error(`Database rejected ACA record: ${acaError.message}`);
      }

      if (syncSessionIdRef.current !== sessionId) return;
      syncHealthDataViaNativeApp(hash, sessionId);
    } catch (error: any) {
      if (syncSessionIdRef.current !== sessionId) return;
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, syncHealthDataViaNativeApp]);

  const handleDisconnect = async () => {
    if (!currentUserId || !existingConnection) return;
    try {
      await supabase.from("data_connections").update({ is_active: false }).eq("id", existingConnection.id);
      onDisconnect?.();
      closeAndReset();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAndReset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <img
              src="/lovable-uploads/8f82179a-e516-4c98-8c9f-aae3ee45c242.png"
              alt="Apple Health"
              ref={appleHealthIconRef}
              className="w-6 h-6"
            />
            <span>{existingConnection ? "Apple Health" : "Connect Apple Health"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">{errorMessage}</p>
            </div>
          )}

          {connectionStatus === "idle" && !existingConnection && !connectedThisSession && (
            <>
              <p className="text-sm text-muted-foreground">Sync your health metrics securely to the IDIA vault.</p>
              <div className="flex space-x-2 mt-4">
                <Button onClick={handleConnect} className="flex-1" disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect Data"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={closeAndReset}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {existingConnection && connectionStatus === "idle" && !connectedThisSession && (
            <div className="space-y-4 text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-green-800">Apple Health Connected</h3>
              <p className="text-sm text-muted-foreground">Your metrics are actively syncing to your vault.</p>
              <div className="flex space-x-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={closeAndReset}>
                  Close
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {connectionStatus === "connecting" && (
            <div className="text-center py-10 space-y-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground animate-pulse">Anchoring cryptographic proof...</p>
              <Button variant="outline" className="w-full" onClick={closeAndReset}>
                Cancel
              </Button>
            </div>
          )}

          {connectionStatus === "connected" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800 text-lg">Data Anchored!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your Apple Health data blocks are flowing into the vault.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={closeAndReset}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {connectionStatus === "error" && (
            <div className="text-center py-4 space-y-2">
              <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
                Retry Connection
              </Button>
              <Button variant="ghost" onClick={closeAndReset} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
