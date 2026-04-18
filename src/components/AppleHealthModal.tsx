import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Zap, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";
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

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [justFinishedSync, setJustFinishedSync] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onComplete, onClose });

  useEffect(() => {
    callbacksRef.current = { onComplete, onClose };
  }, [onComplete, onClose]);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        setAuthSession(session);
      }
    };
    getSession();
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    const syncCompleteHandler = async (serverResponse: any) => {
      try {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setConnectionStatus("connected");
        setIsConnecting(false);
        setJustFinishedSync(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          await supabase.from("data_connections").upsert(
            {
              user_id: session.user.id,
              connection_type: "apple_health",
              connection_name: "Apple Health",
              is_active: true,
              last_sync_at: new Date().toISOString(),
            },
            { onConflict: "user_id,connection_type" },
          );
        }

        const displayData: any = {};
        const count = serverResponse?.processed_count || 0;
        setSyncCount(count);

        if (serverResponse?.processed_data && Array.isArray(serverResponse.processed_data)) {
          let totalSteps = 0;
          let totalCalories = 0;
          let hrValues: number[] = [];

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

        setTimeout(() => {
          if (callbacksRef.current.onComplete) {
            callbacksRef.current.onComplete();
          }
        }, 2500);
      } catch (err: any) {
        setErrorMessage(`Success Callback Error: ${err.message}`);
        setConnectionStatus("error");
        setIsConnecting(false);
      }
    };

    const syncErrorHandler = async (errorMsg: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (currentUserIdRef.current) {
        await supabase
          .from("data_connections")
          .update({ is_active: false })
          .eq("user_id", currentUserIdRef.current)
          .eq("connection_type", "apple_health");
      }
      setErrorMessage(`Sync Error: ${errorMsg}`);
      setConnectionStatus("error");
      setIsConnecting(false);
    };

    (window as any).onHealthDataSyncComplete = syncCompleteHandler;
    (window as any).onHealthDataSyncError = syncErrorHandler;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if ((window as any).onHealthDataSyncComplete === syncCompleteHandler) {
        (window as any).onHealthDataSyncComplete = undefined;
      }
      if ((window as any).onHealthDataSyncError === syncErrorHandler) {
        (window as any).onHealthDataSyncError = undefined;
      }
    };
  }, []);

  const syncHealthDataViaNativeApp = useCallback(
    (hash: string) => {
      const webkit = (window as any).webkit;
      if (webkit?.messageHandlers?.syncHealthData) {
        const requestedTypesByCategory: { [key: string]: string[] } = {};
        ALL_HEALTH_DATA_TYPES.forEach((type) => {
          if (selectedDataTypes.has(type.id)) {
            const cat = type.category.toLowerCase();
            if (!requestedTypesByCategory[cat]) requestedTypesByCategory[cat] = [];
            requestedTypesByCategory[cat].push(type.id);
          }
        });

        timeoutRef.current = setTimeout(() => {
          setErrorMessage("Native bridge timeout. Check permissions.");
          setConnectionStatus("error");
          setIsConnecting(false);
        }, 15000);

        webkit.messageHandlers.syncHealthData.postMessage({
          action: "comprehensive_health_sync",
          config: {
            endpoint: `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync?aca_hash=${hash}`,
            user_id: currentUserId,
            auth_token: authSession?.access_token,
            aca_hash: hash,
          },
          requestedDataTypes: requestedTypesByCategory,
        });
      } else {
        setErrorMessage("Please launch from the IDIA iOS App.");
        setConnectionStatus("error");
        setIsConnecting(false);
      }
    },
    [selectedDataTypes, currentUserId, authSession],
  );

  const handleConnect = useCallback(async () => {
    setErrorMessage(null);
    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      // 1. IDENTITY HEAL: Alignment check before payload generation
      await supabase.from("profiles").update({ platform_guid: currentUserId }).eq("user_id", currentUserId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .single();

      if (!profile?.platform_guid) throw new Error("Profile anchor missing.");

      // 2. ACA GENERATION: Hash is generated FOR the specific payload about to be sent
      const { hash } = await generateACAHash(profile.platform_guid, "DATA_PAYLOAD_CONSENT");

      // 3. AUDIT RECORD: Proof of specific payload consent
      const { error: acaError } = await supabase.from("user_aca_records").upsert(
        {
          platform_guid: profile.platform_guid,
          aca_hash_key: hash,
          source_id: "apple_health",
          consent_type: "DATA_PAYLOAD_CONSENT",
          created_at: new Date().toISOString(),
        },
        { onConflict: "aca_hash_key" },
      );

      if (acaError) console.warn("ACA Hash Insert Warning:", acaError);

      // 4. ATTACH TO PAYLOAD: Pass receipt to the native sync loop
      syncHealthDataViaNativeApp(hash);
    } catch (error: any) {
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, authSession, syncHealthDataViaNativeApp]);

  const handleDisconnect = async () => {
    if (!currentUserId || !existingConnection) return;
    try {
      await supabase.from("data_connections").update({ is_active: false }).eq("id", existingConnection.id);
      onDisconnect?.();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckboxChange = (id: string, isChecked: boolean) => {
    setSelectedDataTypes((prev) => {
      const newSet = new Set(prev);
      isChecked ? newSet.add(id) : newSet.delete(id);
      return newSet;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
            </div>
          )}

          {connectionStatus === "idle" && !existingConnection && (
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
              <Button onClick={handleConnect} className="w-full" disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Apple Health"}
              </Button>
            </>
          )}

          {existingConnection && connectionStatus === "idle" && (
            <div className="space-y-4 text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-green-800">Apple Health Connected</h3>
              <p className="text-sm text-muted-foreground">Your metrics are actively syncing to your vault.</p>
              <div className="flex space-x-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Close
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {connectionStatus === "connecting" && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Authorizing Data Payload...</p>
            </div>
          )}

          {connectionStatus === "connected" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800 text-lg">Sync Complete!</h3>
                {syncCount > 0 && <p className="text-xs text-muted-foreground mt-1">{syncCount} records synced</p>}
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
              <Button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}

          {connectionStatus === "error" && (
            <div className="text-center py-4">
              <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
                Retry Connection
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
