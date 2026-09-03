import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncSessionIdRef = useRef<string | null>(null);
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

  const clearAllTimers = useCallback(() => {
    if (bridgeTimeoutRef.current) {
      clearTimeout(bridgeTimeoutRef.current);
      bridgeTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
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
      closeAndReset();
      burstTriggeredRef.current = false;
    }
  }, [isOpen, closeAndReset]);

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

  // Invoked directly when the database confirms the edge function succeeded
  const handleHardwareVerificationSuccess = useCallback(() => {
    console.log(`[ACTION: React.Verification] Hardware ingestion verified by ledger.`);
    clearAllTimers();
    setConnectionStatus("connected");
    setConnectedThisSession(true);
    setIsConnecting(false);
    onCompleteRef.current?.();

    autoCloseTimeoutRef.current = setTimeout(() => {
      closeAndReset();
    }, 3000);
  }, [clearAllTimers, closeAndReset]);

  // 🚀 HARDWARE SAFETY NET: Realtime + Polling (No synthetic payloads)
  useEffect(() => {
    if (!isConnecting || !currentUserId || !syncSessionIdRef.current) return;
    const sessionId = syncSessionIdRef.current;

    const channel = supabase
      .channel(`sync_watch_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "data_connections",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newRow = payload.new as { connection_type?: string; is_active?: boolean } | null;
          if (newRow && newRow.connection_type === "apple_health" && newRow.is_active === true) {
            console.log("🔥 Realtime Engine confirmed sync!");
            handleHardwareVerificationSuccess();
          }
        },
      )
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (!isMountedRef.current || syncSessionIdRef.current !== sessionId) return;

      const { data } = await supabase
        .from("data_connections")
        .select("is_active")
        .eq("user_id", currentUserId)
        .eq("connection_type", "apple_health")
        .limit(1);

      if (data?.[0]?.is_active === true) {
        console.log("🔥 Ledger Poll confirmed sync!");
        handleHardwareVerificationSuccess();
      }
    }, 3500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isConnecting, currentUserId, handleHardwareVerificationSuccess]);

  const syncHealthDataViaNativeApp = useCallback(
    (hash: string, sessionId: string) => {
      const webkit = (window as any).webkit;

      if (!webkit?.messageHandlers?.syncHealthData) {
        setErrorMessage("Please launch from the IDIA iOS App.");
        setConnectionStatus("error");
        setIsConnecting(false);
        clearAllTimers();
        return;
      }

      // 1. Native Success Handler
      (window as any).onHealthDataSyncComplete = async (serverResponse: any) => {
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        clearAllTimers();

        try {
          const count = serverResponse?.processed_count || 1;
          setSyncCount(count);
          setHealthData({ steps: "Verified" });
          handleHardwareVerificationSuccess();
        } catch (err) {
          console.error(err);
          setErrorMessage("Failed to process sync response.");
          setConnectionStatus("error");
          setIsConnecting(false);
        }
      };

      // 2. Native Error Handler
      (window as any).onHealthDataSyncError = (errorMsg: string) => {
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        if (connectionStatus === "connected" || connectedThisSession) return;

        clearAllTimers();
        setErrorMessage(`Sync Error: ${errorMsg}`);
        setConnectionStatus("error");
        setIsConnecting(false);
      };

      try {
        // 🚨 FIX 1: Send the real requested types so Swift actually attempts a fetch
        const requestedDataTypesMap: Record<string, boolean> = {};
        const requestedDataTypesArray: string[] = [];

        selectedDataTypes.forEach((id) => {
          requestedDataTypesMap[id] = true;
          requestedDataTypesArray.push(id);
        });

        webkit.messageHandlers.syncHealthData.postMessage({
          action: "comprehensive_health_sync",
          endpoint: `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync?aca_hash_key=${hash}`,
          user_id: currentUserId,
          auth_token: authSession?.access_token,
          aca_hash_key: hash,
          sync_session_id: sessionId,
          requestedDataTypes: requestedDataTypesMap,
          requestedDataTypesArray: requestedDataTypesArray,
        });
      } catch (postErr) {
        clearAllTimers();
        setErrorMessage(`Native bridge dispatch failed.`);
        setConnectionStatus("error");
        setIsConnecting(false);
      }
    },
    [
      currentUserId,
      authSession,
      connectionStatus,
      connectedThisSession,
      clearAllTimers,
      handleHardwareVerificationSuccess,
      selectedDataTypes,
    ],
  );

  const handleConnect = useCallback(async () => {
    // 🚨 FIX 1(b): Block dispatch if nothing is selected
    if (selectedDataTypes.size === 0) {
      setErrorMessage("Please select at least one health metric to sync.");
      return;
    }

    setErrorMessage(null);
    setIsConnecting(true);
    setConnectionStatus("connecting");

    const sessionId = Math.random().toString(36).substring(7);
    syncSessionIdRef.current = sessionId;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .limit(1);

      const platformGuid = profile?.[0]?.platform_guid || currentUserId;
      if (!platformGuid) throw new Error("Profile anchor missing.");

      // 🚨 FIX 2: Stop minting throwaways. Reuse the active ACA record.
      let activeHash = "";
      const { data: existingAca } = await supabase
        .from("user_aca_records")
        .select("aca_hash_key")
        .eq("platform_guid", platformGuid)
        .eq("source_id", "apple_health")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingAca && existingAca.length > 0) {
        activeHash = existingAca[0].aca_hash_key;
      } else {
        const { hash, payload } = await generateACAHash(platformGuid, "apple_health", [
          "KYC_VAULT",
          "HEALTH_DATA_READ",
        ]);
        activeHash = hash;

        const { error: acaError } = await supabase.from("user_aca_records").upsert(
          {
            platform_guid: platformGuid,
            aca_hash_key: activeHash,
            source_id: "apple_health",
            consent_scope: payload?.consent_scope || ["HEALTH_DATA_READ"],
          },
          { onConflict: "aca_hash_key" },
        );

        if (acaError) throw new Error(`Database rejected ACA record: ${acaError.message}`);
      }

      // 🚨 FIX 3(a): Seed the connection row so the watcher has a target
      const { error: seedError } = await supabase.from("data_connections").upsert(
        {
          user_id: currentUserId,
          connection_type: "apple_health",
          connection_name: "Apple Health",
          is_active: false,
        },
        { onConflict: "user_id,connection_type" },
      );
      if (seedError) console.warn("Seed failed:", seedError);

      // 🚨 FIX 3(b): Make the modal recover on its own (30s bounded wait)
      connectionTimeoutRef.current = setTimeout(() => {
        if (syncSessionIdRef.current === sessionId && isMountedRef.current) {
          setErrorMessage("Connection timed out. The consent anchor, device fetch, or ingest step stalled.");
          setConnectionStatus("error");
          setIsConnecting(false);
          clearAllTimers();
        }
      }, 30000);

      if (syncSessionIdRef.current !== sessionId) return;
      syncHealthDataViaNativeApp(activeHash, sessionId);
    } catch (error: any) {
      if (syncSessionIdRef.current !== sessionId) return;
      clearAllTimers();
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, syncHealthDataViaNativeApp, clearAllTimers, selectedDataTypes]);

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
              <p className="text-sm text-muted-foreground animate-pulse">Waiting for hardware handshake...</p>
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
