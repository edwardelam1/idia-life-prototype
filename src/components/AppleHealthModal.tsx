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
  { id: "HKQuantityTypeIdentifierStepCount", name: "Steps", category: "Activity" },
  { id: "HKQuantityTypeIdentifierActiveEnergyBurned", name: "Active Energy Burned", category: "Activity" },
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", name: "Heart Rate Variability", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", name: "Respiratory Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", name: "Blood Oxygen", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierBodyTemperature", name: "Body Temperature", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierWalkingAsymmetryPercentage", name: "Gait Asymmetry", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierWalkingDoubleSupportPercentage", name: "Double Support", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierWalkingSpeed", name: "Walking Speed", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierWalkingStepLength", name: "Step Length", category: "Mobility" },
  { id: "HKQuantityTypeIdentifierEnvironmentalAudioExposure", name: "Acoustic Floor (dB)", category: "Environment" },
  { id: "HKQuantityTypeIdentifierUVExposure", name: "UV Exposure", category: "Environment" },
  { id: "HKCategoryTypeIdentifierSleepAnalysis", name: "Sleep Analysis", category: "Vitals" },
];

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [selectedDataTypes] = useState<Set<string>>(new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)));
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
    if (bridgeTimeoutRef.current) clearTimeout(bridgeTimeoutRef.current);
    if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    bridgeTimeoutRef.current = null;
    autoCloseTimeoutRef.current = null;
    connectionTimeoutRef.current = null;
  }, []);

  const detachNativeCallbacks = useCallback(() => {
    if ((window as any).onHealthDataSyncComplete) delete (window as any).onHealthDataSyncComplete;
    if ((window as any).onHealthDataSyncError) delete (window as any).onHealthDataSyncError;
  }, []);

  const closeAndReset = useCallback(() => {
    clearAllTimers();
    syncSessionIdRef.current = null;
    detachNativeCallbacks();
    setIsConnecting(false);
    setConnectionStatus("idle");
    setErrorMessage(null);
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

  const handleLedgerVerification = useCallback(() => {
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

  // 🚀 RECOVERY SAFETY NET: Stays active even during error states to recover on foreground
  useEffect(() => {
    if (!currentUserId || !syncSessionIdRef.current) return;
    const sessionId = syncSessionIdRef.current;

    console.log(`[BEGIN: React.RecoveryNet] Watchers armed for session: ${sessionId}`);

    const verifyDatabaseRow = async () => {
      const { data } = await supabase
        .from("data_connections")
        .select("is_active, last_sync_at")
        .eq("user_id", currentUserId)
        .eq("connection_type", "apple_health")
        .limit(1);

      if (data?.[0]?.is_active === true) {
        console.log("🔥 [ACTION: React.RecoveryNet] Ledger Poll confirmed sync!");
        handleLedgerVerification();
      }
    };

    // 1. Realtime Channel
    const channel = supabase
      .channel(`sync_watch_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_connections", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const newRow = payload.new as { connection_type?: string; is_active?: boolean } | null;
          if (newRow && newRow.connection_type === "apple_health" && newRow.is_active === true) {
            console.log("🔥 [ACTION: React.RecoveryNet] Realtime Engine confirmed sync!");
            handleLedgerVerification();
          }
        },
      )
      .subscribe();

    // 2. Ledger Polling
    const pollInterval = setInterval(() => {
      if (isMountedRef.current && syncSessionIdRef.current === sessionId) verifyDatabaseRow();
    }, 3500);

    // 3. Visibility Recovery (Handles app backgrounding during Face ID)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") verifyDatabaseRow();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log(`[END: React.RecoveryNet] Teardown.`);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId, handleLedgerVerification]);

  const syncHealthDataViaNativeApp = useCallback(
    (hash: string, sessionId: string) => {
      console.log(`[BEGIN: React.SyncHealthDataViaNativeApp] Initializing bridge.`);
      const webkit = (window as any).webkit;

      if (!webkit?.messageHandlers?.syncHealthData) {
        setErrorMessage("Please launch from the IDIA iOS App.");
        setConnectionStatus("error");
        setIsConnecting(false);
        clearAllTimers();
        return;
      }

      (window as any).onHealthDataSyncComplete = async (serverResponse: any) => {
        console.log(
          `[BEGIN: React.NativeCallback.Success] Native sync returned success. Finalizing ledger.`,
          serverResponse,
        );
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        clearAllTimers();
        setSyncCount(serverResponse?.processed_count || 1);

        try {
          // 🚨 CRITICAL FIX: The UI must actively tell the database the connection is now alive.
          // In previous iterations, this was missing, causing the UI to wait infinitely for a flag it was supposed to set.
          await supabase.from("data_connections").upsert(
            {
              user_id: currentUserId,
              connection_type: "apple_health",
              connection_name: "Apple Health",
              is_active: true,
              last_sync_at: new Date().toISOString(),
            },
            { onConflict: "user_id,connection_type" },
          );

          handleLedgerVerification();
        } catch (err) {
          console.error(err);
          setErrorMessage("Failed to finalize ledger state.");
          setConnectionStatus("error");
          setIsConnecting(false);
        }
      };

      (window as any).onHealthDataSyncError = (errorMsg: string) => {
        console.error(`🚨 [BEGIN: React.NativeCallback.Error] Native sync returned error: ${errorMsg}`);
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        if (connectionStatus === "connected" || connectedThisSession) return;

        clearAllTimers();
        setErrorMessage(`Sync Error: ${errorMsg}`);
        setConnectionStatus("error");
        setIsConnecting(false);
      };

      try {
        const requestedDataTypesMap: Record<string, boolean> = {};
        const requestedDataTypesArray: string[] = [];

        selectedDataTypes.forEach((id) => {
          requestedDataTypesMap[id] = true;
          requestedDataTypesArray.push(id);
        });

        console.log(
          `[ACTION: React.NativeDispatch] Dispatching request for ${requestedDataTypesArray.length} metrics.`,
        );
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
        console.error(`🚨 [FATAL: React.NativeDispatch] Dispatch failed:`, postErr);
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
      handleLedgerVerification,
      selectedDataTypes,
    ],
  );

  const handleConnect = useCallback(async () => {
    console.log(`[BEGIN: React.HandleConnect] Flow initiated.`);
    if (selectedDataTypes.size === 0) {
      setErrorMessage("Please select at least one health metric to sync.");
      return;
    }

    setErrorMessage(null);
    setIsConnecting(true);
    setConnectionStatus("connecting");

    const sessionId = Math.random().toString(36).substring(7);
    syncSessionIdRef.current = sessionId;

    // 🚨 WATCHDOG: PHASE 1 (Consent)
    connectionTimeoutRef.current = setTimeout(() => {
      if (syncSessionIdRef.current === sessionId && isMountedRef.current) {
        console.error(`🚨 [FATAL: React.ConnectionTimeout] Stalled at Face ID / Consent.`);
        setErrorMessage("Connection timed out at the Face ID consent step. Please retry.");
        setConnectionStatus("error");
        setIsConnecting(false);
        clearAllTimers();
      }
    }, 45000);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .limit(1);

      const platformGuid = profile?.[0]?.platform_guid || currentUserId;
      if (!platformGuid) throw new Error("Profile anchor missing.");

      let activeHash = "";
      const { data: existingAca } = await supabase
        .from("user_aca_records")
        .select("aca_hash_key")
        .eq("platform_guid", platformGuid)
        .eq("source_id", "apple_health")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingAca && existingAca.length > 0) {
        console.log(`[INFO: React.HandleConnect] Found existing ACA anchor. Reusing.`);
        activeHash = existingAca[0].aca_hash_key;
      } else {
        console.log(`[INFO: React.HandleConnect] No anchor found. Requesting Face ID.`);
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

      // 🚨 CRITICAL FIX: Seed the data_connections row AFTER consent is acquired
      const { error: seedError } = await supabase.from("data_connections").upsert(
        {
          user_id: currentUserId,
          connection_type: "apple_health",
          connection_name: "Apple Health",
          is_active: false,
        },
        { onConflict: "user_id,connection_type" },
      );
      if (seedError) console.warn("🚨 [WARNING: React.HandleConnect] Seed failed:", seedError);

      if (syncSessionIdRef.current !== sessionId) return;

      // 🚨 WATCHDOG: PHASE 2 (Fetch/Ingest)
      // Extended to 120 seconds. 45 seconds was too short for the Edge Function to ingest massive historical payloads.
      clearAllTimers();
      connectionTimeoutRef.current = setTimeout(() => {
        if (syncSessionIdRef.current === sessionId && isMountedRef.current) {
          console.error(`🚨 [FATAL: React.ConnectionTimeout] Stalled at Device Fetch / Ingest.`);
          setErrorMessage("Connection timed out. The device fetch or ingest step stalled - please retry.");
          setConnectionStatus("error");
          setIsConnecting(false);
          clearAllTimers();
        }
      }, 120000);

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
    if (!currentUserId) return;

    console.log("[BEGIN: React.HandleDisconnect] Forcing complete teardown.");
    setConnectionStatus("connecting");

    try {
      await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("user_id", currentUserId)
        .eq("connection_type", "apple_health");

      localStorage.removeItem("apple_health_connected");

      onDisconnect?.();
      closeAndReset();
      console.log("[END: React.HandleDisconnect] Teardown complete.");
    } catch (e) {
      console.error("🚨 [FATAL: React.HandleDisconnect] Teardown failed:", e);
      setConnectionStatus("error");
      setErrorMessage("Failed to disconnect cleanly. Please try again.");
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
