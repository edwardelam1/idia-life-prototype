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
  const permPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncSessionIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);
  const appleHealthIconRef = useRef<HTMLImageElement | null>(null);
  const burstTriggeredRef = useRef(false);
  const confirmedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

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
        currentUserIdRef.current = session.user.id;
        setAuthSession(session);
      }
    });
  }, []);

  const clearAllTimers = useCallback(() => {
    if (bridgeTimeoutRef.current) clearTimeout(bridgeTimeoutRef.current);
    if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    if (permPollRef.current) clearInterval(permPollRef.current);
    bridgeTimeoutRef.current = null;
    autoCloseTimeoutRef.current = null;
    connectionTimeoutRef.current = null;
    permPollRef.current = null;
  }, []);

  const detachNativeCallbacks = useCallback(() => {
    if ((window as any).onHealthDataSyncComplete) delete (window as any).onHealthDataSyncComplete;
    if ((window as any).onHealthDataSyncError) delete (window as any).onHealthDataSyncError;
    if ((window as any).onHealthPermissionsGranted) delete (window as any).onHealthPermissionsGranted;
  }, []);

  // 🚨 Safely revert the connection row to inactive when the user bails,
  // denies HealthKit access, or the flow times out before confirmation.
  const deactivateConnection = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) return;
    try {
      console.log("[ACTION: React.DeactivateConnection] Reverting connection to inactive.");
      await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("connection_type", "apple_health");
    } catch (e) {
      console.error("🚨 [ERROR: React.DeactivateConnection] Failed to revert state:", e);
    }
  }, []);

  // Flip the seeded row to active — only ever called after the device proves a real read.
  const activateConnection = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) return;
    const { data: row } = await supabase
      .from("data_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("connection_type", "apple_health")
      .limit(1);
    if (row && row.length > 0) {
      await supabase
        .from("data_connections")
        .update({ is_active: true, last_sync_at: new Date().toISOString() })
        .eq("id", row[0].id);
    }
  }, []);

  const closeAndReset = useCallback(() => {
    // If the modal is closed while an attempt is still in flight (never confirmed),
    // leave no active Apple Health row behind.
    if (syncSessionIdRef.current && !confirmedRef.current) {
      deactivateConnection();
    }
    confirmedRef.current = false;
    clearAllTimers();
    syncSessionIdRef.current = null;
    detachNativeCallbacks();
    setIsConnecting(false);
    setConnectionStatus("idle");
    setErrorMessage(null);
    setSyncCount(0);
    setConnectedThisSession(false);
    onCloseRef.current?.();
  }, [clearAllTimers, detachNativeCallbacks, deactivateConnection]);

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
    console.log(`[ACTION: React.Verification] Active connection verified.`);
    confirmedRef.current = true;
    clearAllTimers();
    setConnectionStatus("connected");
    setConnectedThisSession(true);
    setIsConnecting(false);
    onCompleteRef.current?.();

    autoCloseTimeoutRef.current = setTimeout(() => {
      closeAndReset();
    }, 2000);
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
        console.log(`[BEGIN: React.NativeCallback.Success] Native sync background process completed.`, serverResponse);
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        clearAllTimers();
        setSyncCount(serverResponse?.processed_count || 1);

        try {
          // 🚨 ACTIVATION LAST: device proved a real read — now flip the ledger active.
          await activateConnection();
          handleLedgerVerification();
        } catch (err) {
          console.error(err);
          deactivateConnection();
          setErrorMessage("Failed to process sync response.");
          setConnectionStatus("error");
          setIsConnecting(false);
        }
      };

      (window as any).onHealthDataSyncError = (errorMsg: string) => {
        console.error(`🚨 [BEGIN: React.NativeCallback.Error] Native sync returned error: ${errorMsg}`);
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        if (connectionStatus === "connected" || connectedThisSession) return;

        clearAllTimers();
        deactivateConnection();

        // 🚨 DENIAL DETECTION: iOS permission refusals are a hard failure — never connect.
        const lower = String(errorMsg).toLowerCase();
        if (
          lower.includes("denied") ||
          lower.includes("not allowed") ||
          lower.includes("authorization") ||
          lower.includes("unauthorized")
        ) {
          console.warn(`🚨 [FATAL: React.NativeCallback.Error] HealthKit access denied by user.`);
          setErrorMessage("Apple Health access was not allowed — no data can be synced.");
        } else {
          setErrorMessage(`Sync Error: ${errorMsg}`);
        }
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

        // No artificial success timer: the modal resolves ONLY on the native
        // success/error callback, or when the server-side sync flips the
        // ledger row active (RecoveryNet realtime/poll). Data ingestion
        // continues in the background regardless of modal state.
      } catch (postErr) {
        console.error(`🚨 [FATAL: React.NativeDispatch] Dispatch failed:`, postErr);
        clearAllTimers();
        deactivateConnection();
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
      selectedDataTypes,
      activateConnection,
      deactivateConnection,
      handleLedgerVerification,
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

    // 🚨 WATCHDOG: covers consent AND the native HealthKit permission sheet.
    connectionTimeoutRef.current = setTimeout(() => {
      if (syncSessionIdRef.current === sessionId && isMountedRef.current && !confirmedRef.current) {
        console.error(`🚨 [FATAL: React.ConnectionTimeout] Routine stalled — no confirmation within 45s.`);
        setErrorMessage("Connection timed out. The consent anchor, device fetch, or ingest step stalled.");
        setConnectionStatus("error");
        setIsConnecting(false);
        deactivateConnection();
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

      // STRICT PROTOCOL: always mint a fresh ACA — Face ID prompts on every attempt. No reuse.
      console.log(`[INFO: React.HandleConnect] Requesting Face ID for fresh ACA.`);
      const { hash: activeHash, payload } = await generateACAHash(platformGuid, "apple_health", [
        "KYC_VAULT",
        "HEALTH_DATA_READ",
      ]);

      const { error: acaError } = await supabase.from("user_aca_records").insert({
        platform_guid: platformGuid,
        aca_hash_key: activeHash,
        source_id: "apple_health",
        consent_scope: payload?.consent_scope || ["HEALTH_DATA_READ"],
      });

      if (acaError) throw new Error(`Database rejected ACA record: ${acaError.message}`);

      // 🚨 CONSENT FIRST, ACTIVATION LAST: seed the row INACTIVE.
      // It only flips to active when the device proves a real read (native success,
      // realtime watcher, or ledger poll). UPDATE-then-INSERT, no upsert.
      const { data: seedRow } = await supabase
        .from("data_connections")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("connection_type", "apple_health")
        .limit(1);

      if (!seedRow || seedRow.length === 0) {
        const { error: seedError } = await supabase.from("data_connections").insert({
          user_id: currentUserId,
          connection_type: "apple_health",
          connection_name: "Apple Health",
          is_active: false,
        });
        if (seedError) console.warn("🚨 [WARNING: React.HandleConnect] Seed insert failed:", seedError);
      } else {
        const { error: seedError } = await supabase
          .from("data_connections")
          .update({ is_active: false, connection_name: "Apple Health" })
          .eq("id", seedRow[0].id);
        if (seedError) console.warn("🚨 [WARNING: React.HandleConnect] Seed update failed:", seedError);
      }

      if (syncSessionIdRef.current !== sessionId) return;

      // Dispatch to native shell — the watchdog stays armed; only a confirmed read
      // (or the silent-success fallback) resolves the UI now.
      syncHealthDataViaNativeApp(activeHash, sessionId);
    } catch (error: any) {
      if (syncSessionIdRef.current !== sessionId) return;
      clearAllTimers();
      deactivateConnection();
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, syncHealthDataViaNativeApp, clearAllTimers, deactivateConnection, selectedDataTypes]);

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
