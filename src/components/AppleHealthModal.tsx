import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Footprints, Zap, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { generateACAHash } from "@/utils/acaGenerator";

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const ALL_HEALTH_DATA_TYPES = [
  { id: "HKQuantityTypeIdentifierStepCount", name: "Steps", category: "Activity" },
  { id: "HKQuantityTypeIdentifierDistanceWalkingRunning", name: "Distance (Walking/Running)", category: "Activity" },
  { id: "HKQuantityTypeIdentifierDistanceCycling", name: "Distance (Cycling)", category: "Activity" },
  { id: "HKQuantityTypeIdentifierFlightsClimbed", name: "Flights Climbed", category: "Activity" },
  { id: "HKQuantityTypeIdentifierActiveEnergyBurned", name: "Active Energy Burned", category: "Activity" },
  { id: "HKQuantityTypeIdentifierBasalEnergyBurned", name: "Basal Energy Burned", category: "Activity" },
  { id: "HKQuantityTypeIdentifierAppleExerciseTime", name: "Exercise Time", category: "Activity" },
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRestingHeartRate", name: "Resting Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", name: "Blood Oxygen", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", name: "Respiratory Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierVO2Max", name: "VO2 Max", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierHeight", name: "Height", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyMass", name: "Weight", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyMassIndex", name: "BMI", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyFatPercentage", name: "Body Fat %", category: "Body" },
  { id: "HKQuantityTypeIdentifierDietaryEnergyConsumed", name: "Dietary Energy", category: "Nutrition" },
  { id: "HKCategoryTypeIdentifierMindfulSession", name: "Mindful Minutes", category: "Mindfulness" },
  { id: "HKWorkoutTypeIdentifier", name: "Workout Data", category: "Activity" },
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

  // --- Lifecycle refs ---
  const bridgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Load auth session once
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
  }, []);

  const detachNativeCallbacks = useCallback(() => {
    if ((window as any).onHealthDataSyncComplete) {
      (window as any).onHealthDataSyncComplete = undefined;
    }
    if ((window as any).onHealthDataSyncError) {
      (window as any).onHealthDataSyncError = undefined;
    }
  }, []);

  // Single-path close + reset. Every exit route flows through this.
  const closeAndReset = useCallback(() => {
    clearAllTimers();
    syncSessionIdRef.current = null; // invalidates any in-flight callbacks
    detachNativeCallbacks();
    setIsConnecting(false);
    setConnectionStatus("idle");
    setErrorMessage(null);
    setHealthData(null);
    setSyncCount(0);
    setConnectedThisSession(false);
    onCloseRef.current?.();
  }, [clearAllTimers, detachNativeCallbacks]);

  // Reset state whenever the modal is closed externally
  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      syncSessionIdRef.current = null;
      detachNativeCallbacks();
      setIsConnecting(false);
      setConnectionStatus("idle");
      setErrorMessage(null);
      setHealthData(null);
      setSyncCount(0);
      setConnectedThisSession(false);
    }
  }, [isOpen, clearAllTimers, detachNativeCallbacks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      detachNativeCallbacks();
    };
  }, [clearAllTimers, detachNativeCallbacks]);

  const syncHealthDataViaNativeApp = useCallback(
    (hash: string, sessionId: string) => {
      const webkit = (window as any).webkit;
      if (!webkit?.messageHandlers?.syncHealthData) {
        setErrorMessage("Please launch from the IDIA iOS App.");
        setConnectionStatus("error");
        setIsConnecting(false);
        return;
      }

      // ---- Register session-gated native callbacks ----
      (window as any).onHealthDataSyncComplete = (serverResponse: any) => {
        // REJECT STALE CALLBACKS
        const incomingId = typeof serverResponse === "string" ? serverResponse : serverResponse?.sync_session_id;
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;

        try {
          const displayData: any = {};
          const count = serverResponse?.processed_count || 0;
          setSyncCount(count);

          if (Array.isArray(serverResponse?.processed_data)) {
            let totalSteps = 0;
            let totalCalories = 0;
            const hrValues: number[] = [];
            serverResponse.processed_data.forEach((item: any) => {
              const val = item.value !== undefined ? Number(item.value) : 0;
              if (isNaN(val)) return;
              if (item.type === "steps" || item.type === "stepCount") totalSteps += val;
              else if (item.type === "heartRate") hrValues.push(val);
              else if (item.type === "activeEnergyBurned" || item.type === "calories") totalCalories += val;
            });
            if (totalSteps > 0) displayData.steps = totalSteps;
            if (totalCalories > 0) displayData.calories = totalCalories;
            if (hrValues.length > 0) {
              displayData.heartRate = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
            }
          }
          setHealthData(displayData);

          // 🚨 THE FIX: Move the "Connected" state here!
          // Now it only shows green AFTER the iPhone officially finishes syncing.
          setConnectionStatus("connected");
          setConnectedThisSession(true);
          setIsConnecting(false);

          // Tell the dashboard underneath to refresh
          onCompleteRef.current?.();

          // 🚨 THE FIX: Add the auto-close timer back!
          // Give the user 3 seconds to see their synced steps/calories, then close it on its own.
          autoCloseTimeoutRef.current = setTimeout(() => {
            closeAndReset();
          }, 3000);
        } catch (err: any) {
          console.warn("Sync enrichment failed:", err);
        }
      };

      (window as any).onHealthDataSyncError = (errorMsg: string, incomingId?: string) => {
        if (syncSessionIdRef.current !== sessionId || !isMountedRef.current) return;
        if (connectionStatus === "connected" || connectedThisSession) return;

        clearAllTimers();
        setErrorMessage(`Sync Error: ${errorMsg}`);
        setConnectionStatus("error");
        setIsConnecting(false);
      };

      const requestedTypesByCategory: { [key: string]: string[] } = {};
      ALL_HEALTH_DATA_TYPES.forEach((type) => {
        if (selectedDataTypes.has(type.id)) {
          const cat = type.category.toLowerCase();
          if (!requestedTypesByCategory[cat]) requestedTypesByCategory[cat] = [];
          requestedTypesByCategory[cat].push(type.id);
        }
      });

      // FLAT payload — iOS bridge contract
      try {
        webkit.messageHandlers.syncHealthData.postMessage({
          action: "comprehensive_health_sync",
          endpoint: `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync?aca_hash=${hash}`,
          user_id: currentUserId,
          auth_token: authSession?.access_token,
          aca_hash: hash,
          requestedDataTypes: requestedTypesByCategory,
          sync_session_id: sessionId,
        });
      } catch (postErr: any) {
        setErrorMessage(`Native bridge dispatch failed.`);
        setConnectionStatus("error");
        setIsConnecting(false);
        return;
      }

      // 🚨 DELETED: The code that used to immediately trigger "Connected" was right here.
      // It is gone, so the UI will stay on the "Connecting..." spinner until the callback fires!
    },
    [
      selectedDataTypes,
      currentUserId,
      authSession,
      clearAllTimers,
      closeAndReset,
      connectionStatus,
      connectedThisSession,
    ],
  );

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
              <p className="text-sm text-muted-foreground">Select the health metrics you wish to sync.</p>
              <div className="max-h-60 overflow-y-auto border p-2 rounded-md bg-muted/30 mb-4">
                {Array.from(new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.category))).map((category) => (
                  <div key={category} className="mb-2">
                    <h5 className="font-semibold text-xs text-muted-foreground mt-1">{category}</h5>
                    {ALL_HEALTH_DATA_TYPES.filter((d) => d.category === category).map((type) => (
                      <div key={type.id} className="flex items-center space-x-2 text-xs py-1">
                        <Checkbox
                          id={type.id}
                          checked={selectedDataTypes.has(type.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(type.id, !!checked)}
                        />
                        <label htmlFor={type.id} className="text-muted-foreground cursor-pointer">
                          {type.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleConnect} className="flex-1" disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect"}
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
              <p className="text-sm text-muted-foreground">Your data is now syncing to the vault.</p>
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
                <h3 className="font-medium text-green-800 text-lg">Apple Health Connected</h3>
                <p className="text-sm text-muted-foreground mt-1">Your metrics are actively syncing to your vault.</p>
                {syncCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{syncCount} records synced this session</p>
                )}
              </div>
              {healthData && (
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Footprints className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">
                        {healthData.steps ? healthData.steps.toLocaleString() : "--"}
                      </div>
                      <div className="text-xs text-muted-foreground">Steps</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">{healthData.heartRate || "--"}</div>
                      <div className="text-xs text-muted-foreground">BPM</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">
                        {healthData.calories ? Math.round(healthData.calories).toLocaleString() : "--"}
                      </div>
                      <div className="text-xs text-muted-foreground">Cal</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={closeAndReset}>
                  Close
                </Button>
                {(existingConnection || connectedThisSession) && (
                  <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                )}
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
