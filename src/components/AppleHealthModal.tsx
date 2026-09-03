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
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("Anchoring cryptographic proof...");
  const [syncCount, setSyncCount] = useState(0);
  const [connectedThisSession, setConnectedThisSession] = useState(false);

  const bridgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    console.log("[BEGIN] isMountedRef initialization");
    isMountedRef.current = true;
    console.log("[END] isMountedRef initialization");
    return () => {
      console.log("[BEGIN] Component unmount cleanup");
      isMountedRef.current = false;
      console.log("[END] Component unmount cleanup");
    };
  }, []);

  useEffect(() => {
    console.log("[BEGIN] Auth session retrieval");
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("[ERROR] Auth session retrieval failed:", error);
          return;
        }
        if (session?.user && isMountedRef.current) {
          console.log("[PROGRESS] Auth session retrieved successfully");
          setCurrentUserId(session.user.id);
          setAuthSession(session);
        } else {
          console.log("[PROGRESS] No active user session found or component unmounted");
        }
        console.log("[END] Auth session retrieval");
      })
      .catch((err) => {
        console.error("[ERROR] Auth session retrieval threw exception:", err);
      });
  }, []);

  useEffect(() => {
    if (!isConnecting || !currentUserId || !syncSessionIdRef.current) return;

    console.log("[BEGIN] Hybrid safety net initialization");
    const sessionId = syncSessionIdRef.current;
    console.log(`[PROGRESS] Hybrid safety net active for session: ${sessionId}`);

    // Only a write committed during THIS attempt counts as proof of a sync.
    const startedAt = new Date().toISOString();

    const confirmFromLedger = (recordCount: number) => {
      console.log("[PROGRESS] Ledger confirmed a committed sync for this session");
      if (typeof (window as any).onHealthDataSyncComplete === "function") {
        (window as any).onHealthDataSyncComplete({
          sync_session_id: sessionId,
          success: true,
          source: "ledger",
          processed_count: recordCount,
        });
      } else {
        console.error("[ERROR] Global onHealthDataSyncComplete callback is undefined during ledger closure");
      }
    };

    // NOTE: the connection row is now written by the React handshake before the
    // shell runs, so `data_connections.last_sync_at` is no longer proof of an
    // ingested sample. Only committed raw_health_data rows count as success.
    console.log("[PROGRESS] Setting up Realtime Channel subscription");
    const channel = supabase
      .channel(`sync_watch_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "raw_health_data",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          confirmFromLedger(1);
        },
      )
      .subscribe((status, err) => {
        console.log(`[PROGRESS] Realtime Channel subscription status: ${status}`);
        if (err) console.error("[ERROR] Realtime Channel subscription error:", err);
      });

    console.log("[PROGRESS] Setting up Ledger Polling interval");
    const pollInterval = setInterval(async () => {
      if (!isMountedRef.current || syncSessionIdRef.current !== sessionId) return;

      try {
        // Only committed health rows count. The connection row is anchored by the
        // handshake and would otherwise report a sync that never carried data.
        const { data: rows, error } = await supabase
          .from("raw_health_data")
          .select("id")
          .eq("user_id", currentUserId)
          .gte("created_at", startedAt)
          .limit(1);
        if (error) {
          console.error("[ERROR] Ledger Polling query failed:", error);
        } else if (rows && rows.length > 0) {
          confirmFromLedger(rows.length);
        } else {
          console.log("[PROGRESS] Ledger Poll verified no ingestion yet");
        }
      } catch (pollErr) {
        console.error("[ERROR] Ledger Polling exception caught:", pollErr);
      }
    }, 3500);


    console.log("[END] Hybrid safety net initialization");

    return () => {
      console.log("[BEGIN] Hybrid safety net cleanup");
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      console.log("[END] Hybrid safety net cleanup");
    };
  }, [isConnecting, currentUserId]);

  const clearAllTimers = useCallback(() => {
    console.log("[BEGIN] clearAllTimers invoked");
    if (bridgeTimeoutRef.current) {
      clearTimeout(bridgeTimeoutRef.current);
      bridgeTimeoutRef.current = null;
      console.log("[PROGRESS] bridgeTimeout cleared");
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
      console.log("[PROGRESS] autoCloseTimeout cleared");
    }
    console.log("[END] clearAllTimers complete");
  }, []);

  const detachNativeCallbacks = useCallback(() => {
    console.log("[BEGIN] detachNativeCallbacks invoked");
    if ((window as any).onHealthDataSyncComplete) {
      (window as any).onHealthDataSyncComplete = undefined;
      console.log("[PROGRESS] onHealthDataSyncComplete detached");
    }
    if ((window as any).onHealthDataSyncError) {
      (window as any).onHealthDataSyncError = undefined;
      console.log("[PROGRESS] onHealthDataSyncError detached");
    }
    if ((window as any).onHealthSamplesReady) {
      (window as any).onHealthSamplesReady = undefined;
      console.log("[PROGRESS] onHealthSamplesReady detached");
    }
    console.log("[END] detachNativeCallbacks complete");
  }, []);

  const closeAndReset = useCallback(() => {
    console.log("[BEGIN] closeAndReset invoked");
    clearAllTimers();
    syncSessionIdRef.current = null;
    detachNativeCallbacks();
    setIsConnecting(false);
    setConnectionStatus("idle");
    setErrorMessage(null);
    setHealthData(null);
    setSyncCount(0);
    setConnectedThisSession(false);

    if (onCloseRef.current) {
      console.log("[PROGRESS] Invoking modal onClose prop");
      onCloseRef.current();
    }
    console.log("[END] closeAndReset complete");
  }, [clearAllTimers, detachNativeCallbacks]);

  useEffect(() => {
    if (!isOpen) {
      console.log("[BEGIN] isOpen false handler");
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
      console.log("[END] isOpen false handler complete");
    }
  }, [isOpen, clearAllTimers, detachNativeCallbacks]);

  useEffect(() => {
    if (connectionStatus !== "connected" || burstTriggeredRef.current) return;
    console.log("[BEGIN] Triggering psychometric confetti");
    const rect = appleHealthIconRef.current?.getBoundingClientRect();
    if (rect) {
      fireAppleHealthDataBurst({
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      });
      burstTriggeredRef.current = true;
      console.log("[PROGRESS] Confetti burst fired");
    }
    console.log("[END] Triggering psychometric confetti");
  }, [connectionStatus]);

  const syncHealthDataViaNativeApp = useCallback(
    (hash: string, sessionId: string) => {
      console.log("[BEGIN] syncHealthDataViaNativeApp: Invoked");
      const webkit = (window as any).webkit;

      if (!webkit?.messageHandlers?.syncHealthData) {
        console.error("[ERROR] syncHealthDataViaNativeApp: webkit.messageHandlers.syncHealthData is undefined");
        setErrorMessage("Please launch from the IDIA iOS App.");
        setConnectionStatus("error");
        setIsConnecting(false);
        console.log("[END] syncHealthDataViaNativeApp: Aborted due to missing bridge");
        return;
      }

      (window as any).onHealthDataSyncComplete = (serverResponse: any) => {
        console.log("[BEGIN] Native Callback: onHealthDataSyncComplete fired", serverResponse);

        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) {
          console.log("[END] Native Callback: Session mismatch or unmounted, ignoring success");
          return;
        }

        try {
          const response = typeof serverResponse === "string" ? {} : serverResponse || {};
          const status = Number(response.status ?? response.http_status ?? 0);

          // The shell (or the ledger watcher) must report an actual server success.
          // A bare callback is not proof that anything was saved.
          const serverRejected = response.success === false || (status > 0 && status >= 400);
          if (serverRejected) {
            clearAllTimers();
            setErrorMessage(
              response.error || `The server rejected the upload${status ? ` (HTTP ${status})` : ""}. Please retry.`,
            );
            setConnectionStatus("error");
            setIsConnecting(false);
            return;
          }

          clearAllTimers();
          const count = Number(response.processed_count ?? 0);
          setSyncCount(Number.isFinite(count) ? count : 0);
          setHealthData(null);

          setConnectionStatus("connected");
          setConnectedThisSession(true);
          setIsConnecting(false);

          if (onCompleteRef.current) {
            console.log("[PROGRESS] Invoking onComplete prop");
            onCompleteRef.current();
          }

          autoCloseTimeoutRef.current = setTimeout(() => {
            console.log("[PROGRESS] Native Callback: Auto-closing modal");
            closeAndReset();
          }, 3000);
          console.log("[END] Native Callback: Success state fully resolved");
        } catch (err: any) {
          console.error("[ERROR] Native Callback: onHealthDataSyncComplete exception", err);
          setErrorMessage("The app could not read the server's response. Please retry.");
          setConnectionStatus("error");
          setIsConnecting(false);
        }
      };


      (window as any).onHealthDataSyncError = (errorMsg: string, incomingId?: string) => {
        console.error(`[BEGIN] Native Callback: onHealthDataSyncError fired - ${errorMsg}`);
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) {
          console.log("[END] Native Callback: Error callback ignored (session mismatch or unmounted)");
          return;
        }
        if (connectionStatus === "connected" || connectedThisSession) {
          console.log("[END] Native Callback: Error callback ignored (already connected)");
          return;
        }

        clearAllTimers();
        setErrorMessage(`Sync Error: ${errorMsg}`);
        setConnectionStatus("error");
        setIsConnecting(false);
        console.log("[END] Native Callback: Error state fully resolved");
      };

      // The shell may instead hand raw HealthKit samples back to JS. When it does,
      // the web app performs the upload itself so the request is provably made.
      (window as any).onHealthSamplesReady = async (samples: any) => {
        console.log("[BEGIN] Native Callback: onHealthSamplesReady fired");
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) {
          console.log("[END] Native Callback: onHealthSamplesReady ignored (session mismatch)");
          return;
        }
        try {
          const payload = typeof samples === "string" ? JSON.parse(samples) : samples;
          const list = Array.isArray(payload) ? payload : payload?.data || payload?.samples || [];
          console.log(`[PROGRESS] onHealthSamplesReady: uploading ${list.length} samples from JS`);
          setStage("Uploading HealthKit samples to the vault...");
          const { data: result, error } = await supabase.functions.invoke("apple-health-sync", {
            body: { user_id: currentUserId, aca_hash_key: hash, sync_session_id: sessionId, data: list },
          });
          if (error) throw new Error(error.message);
          if (typeof (window as any).onHealthDataSyncComplete === "function") {
            (window as any).onHealthDataSyncComplete({ ...(result || {}), sync_session_id: sessionId });
          }
          console.log("[END] Native Callback: onHealthSamplesReady upload complete");
        } catch (uploadErr: any) {
          console.error("[ERROR] onHealthSamplesReady upload failed", uploadErr);
          clearAllTimers();
          setErrorMessage(`Upload failed: ${uploadErr?.message || "unknown error"}`);
          setConnectionStatus("error");
          setIsConnecting(false);
        }
      };

      try {
        console.log("[PROGRESS] syncHealthDataViaNativeApp: Dispatching postMessage to Swift");
        setStage("Awaiting iOS HealthKit extraction...");

        const endpoint = `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync?aca_hash_key=${encodeURIComponent(hash)}`;
        const requestedDataTypes = ALL_HEALTH_DATA_TYPES.reduce<Record<string, string[]>>((groups, dataType) => {
          if (!selectedDataTypes.has(dataType.id)) return groups;
          const category = dataType.category.toLowerCase();
          groups[category] = [...(groups[category] ?? []), dataType.id];
          return groups;
        }, {});

        // Keep both forms during the native-shell transition. Existing iOS builds
        // decode upload credentials from `config`, while newer builds read the
        // same fields at the root. Removing `config` caused the shell to stop
        // before making its URLSession request, so the Edge Function was never hit.
        const config = {
          endpoint,
          user_id: currentUserId,
          auth_token: authSession?.access_token,
          aca_hash: hash,
          aca_hash_key: hash,
          sync_session_id: sessionId,
        };

        webkit.messageHandlers.syncHealthData.postMessage({
          // Newer shells hand samples back to JS; older shells upload themselves.
          action: "fetch_health_samples",
          legacy_action: "comprehensive_health_sync",
          config,
          ...config,
          requestedDataTypes,
        });
        console.log("[PROGRESS] syncHealthDataViaNativeApp: postMessage dispatched successfully");

        // Shell watchdog: the connection row is already anchored by the React
        // handshake, so the only thing outstanding is the shell. If it goes silent
        // (it never calls the error callback when it crashes), fail fast at 15s and
        // name the real stage instead of blaming Apple Health settings.
        if (bridgeTimeoutRef.current) clearTimeout(bridgeTimeoutRef.current);
        bridgeTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current || syncSessionIdRef.current !== sessionId) return;
          if (connectedThisSession) return;
          console.error("[ERROR] Shell watchdog tripped — no HealthKit data returned in 15s");
          setErrorMessage(
            "The iOS app never returned HealthKit data — no upload was attempted. Your connection is registered; tap Retry to pull data again.",
          );
          setConnectionStatus("error");
          setIsConnecting(false);
        }, 15000);

      } catch (postErr: any) {
        console.error("[ERROR] syncHealthDataViaNativeApp: webkit.postMessage failed", postErr);
        setErrorMessage(`Native bridge dispatch failed.`);
        setConnectionStatus("error");
        setIsConnecting(false);
        console.log("[END] syncHealthDataViaNativeApp: Failed during dispatch");
      }

    },
    [
      currentUserId,
      authSession,
      selectedDataTypes,
      connectionStatus,
      connectedThisSession,
      clearAllTimers,
      closeAndReset,
    ],
  );

  const handleConnect = useCallback(async () => {
    console.log("[BEGIN] handleConnect: Invoked");
    if (!currentUserId || !authSession?.access_token) {
      setErrorMessage("Your sign-in session is not ready. Close this window and try again.");
      setConnectionStatus("error");
      setIsConnecting(false);
      return;
    }
    setErrorMessage(null);
    setIsConnecting(true);
    setStage("Anchoring cryptographic proof...");
    setConnectionStatus("connecting");

    const sessionId = Math.random().toString(36).substring(7);
    syncSessionIdRef.current = sessionId;
    console.log(`[PROGRESS] handleConnect: Generated session ID ${sessionId}`);

    try {
      console.log("[PROGRESS] handleConnect: Fetching platform_guid from profiles");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .limit(1);

      if (profileError) {
        console.error(`[ERROR] handleConnect: Profile fetch failed`, profileError);
      }

      const platformGuid = profile?.[0]?.platform_guid || currentUserId;
      if (!platformGuid) throw new Error("Profile anchor missing.");

      console.log("[PROGRESS] handleConnect: Generating ACA Hash");
      const { hash, payload } = await generateACAHash(platformGuid, "apple_health", ["KYC_VAULT", "HEALTH_DATA_READ"]);

      console.log("[PROGRESS] handleConnect: Upserting user_aca_records");
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
        console.error(`[ERROR] handleConnect: ACA Upsert failed`, acaError);
        throw new Error(`Database rejected ACA record: ${acaError.message}`);
      }

      if (syncSessionIdRef.current !== sessionId) {
        console.log("[END] handleConnect: Session ID mismatch, aborting");
        return;
      }

      // React-driven reachability handshake. This guarantees the Edge Function is
      // actually invoked and the apple_health connection row is written, even if
      // the native shell later goes silent. Zero samples: it never overwrites data.
      console.log("[PROGRESS] handleConnect: Executing direct server reachability handshake");
      setStage("Testing server reachability...");
      const { data: handshake, error: handshakeError } = await supabase.functions.invoke("apple-health-sync", {
        body: { user_id: currentUserId, aca_hash_key: hash, sync_session_id: sessionId, data: [] },
      });

      if (handshakeError) {
        console.error("[ERROR] handleConnect: Handshake failed", handshakeError);
        throw new Error(`Server unreachable during handshake: ${handshakeError.message}`);
      }
      if (handshake && handshake.success === false) {
        console.error("[ERROR] handleConnect: Handshake rejected by server", handshake.error);
        throw new Error(handshake.error || "The server rejected the connection handshake.");
      }
      console.log("[PROGRESS] handleConnect: Server handshake successful. Connection row anchored.");

      if (syncSessionIdRef.current !== sessionId) {
        console.log("[END] handleConnect: Session ID mismatch after handshake, aborting");
        return;
      }

      console.log("[PROGRESS] handleConnect: Handoff to syncHealthDataViaNativeApp");
      syncHealthDataViaNativeApp(hash, sessionId);
      console.log("[END] handleConnect: Successful setup before native dispatch");
    } catch (error: any) {
      console.error(`[ERROR] handleConnect: Caught exception - ${error?.message}`, error);
      if (syncSessionIdRef.current !== sessionId) return;
      const raw = String(error?.message || "");
      const friendly =
        raw === "BIOMETRIC_TIMEOUT"
          ? "Face ID / Touch ID did not respond in time. Tap Retry to verify again."
          : raw === "BIOMETRIC_REJECTED"
            ? "Biometric verification was cancelled or failed. Tap Retry."
            : raw || "Connection failed. Tap Retry.";
      setErrorMessage(friendly);
      setConnectionStatus("error");
      setIsConnecting(false);
      console.log("[END] handleConnect: Failed state updated");
    }

  }, [currentUserId, authSession, syncHealthDataViaNativeApp]);

  const handleDisconnect = async () => {
    console.log("[BEGIN] handleDisconnect: Invoked");
    if (!currentUserId || !existingConnection) {
      console.log("[END] handleDisconnect: Aborted (no active user or connection)");
      return;
    }
    try {
      console.log(`[PROGRESS] handleDisconnect: Updating connection ${existingConnection.id} to inactive`);
      const { error } = await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("id", existingConnection.id);

      if (error) {
        console.error("[ERROR] handleDisconnect: Supabase update failed", error);
        throw error;
      }

      if (onDisconnect) {
        console.log("[PROGRESS] handleDisconnect: Invoking onDisconnect prop");
        onDisconnect();
      }

      console.log("[PROGRESS] handleDisconnect: Executing closeAndReset");
      closeAndReset();
      console.log("[END] handleDisconnect: Success");
    } catch (e: any) {
      console.error("[ERROR] handleDisconnect: Exception caught:", e);
      console.log("[END] handleDisconnect: Failed");
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
              <p className="text-sm text-muted-foreground animate-pulse">{stage}</p>
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
