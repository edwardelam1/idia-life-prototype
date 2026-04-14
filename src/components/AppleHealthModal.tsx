import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Zap } from "lucide-react";
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

// 🚨 RESTORED: The full list of 19 data points 🚨
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

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
    (window as any).onHealthDataSyncComplete = async (serverResponse: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (currentUserIdRef.current) {
        await supabase.from("data_connections").upsert(
          {
            user_id: currentUserIdRef.current,
            connection_type: "apple_health",
            connection_name: "Apple Health",
            is_active: true,
            last_sync_at: new Date().toISOString(),
          },
          { onConflict: "user_id,connection_type" },
        );
      }

      // 🚨 FIX: Strict mapping of the Edge Function response array to the UI 🚨
      let displayData: any = {};

      if (serverResponse?.processed_data && Array.isArray(serverResponse.processed_data)) {
        serverResponse.processed_data.forEach((item: any) => {
          // If value is missing or undefined, default to 0 so we don't show "Mock" or NaN
          const safeValue = item.value !== undefined ? item.value : 0;

          if (item.type === "steps" || item.type === "stepCount") displayData.steps = safeValue;
          if (item.type === "heartRate") displayData.heartRate = safeValue;
          if (item.type === "activeEnergyBurned" || item.type === "calories") displayData.calories = safeValue;
          if (item.type === "sleepAnalysis" || item.type === "sleepHours") displayData.sleepHours = safeValue;
        });
      } else {
        // Fallback if the edge function returns a flat object
        displayData = serverResponse?.health_data || serverResponse || {};
      }

      setHealthData(displayData);
      setConnectionStatus("connected");
      setIsConnecting(false);
    };

    (window as any).onHealthDataSyncError = async (errorMsg: string) => {
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

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      (window as any).onHealthDataSyncComplete = undefined;
      (window as any).onHealthDataSyncError = undefined;
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

        const comprehensiveHealthRequest = {
          action: "comprehensive_health_sync",
          config: {
            endpoint: `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync?aca_hash=${hash}`,
            user_id: currentUserId,
            auth_token: authSession?.access_token,
            aca_hash: hash,
          },
          requestedDataTypes: requestedTypesByCategory,
        };

        webkit.messageHandlers.syncHealthData.postMessage(comprehensiveHealthRequest);
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .single();

      if (!profile?.platform_guid) throw new Error("Profile anchor missing.");

      const { hash } = await generateACAHash(profile.platform_guid, "apple_health");

      const { error: acaError } = await supabase.from("user_aca_records").insert({
        platform_guid: profile.platform_guid,
        aca_hash_key: hash,
        source_id: "apple_health",
      });

      if (acaError) {
        console.error("ACA Hash Insert Failed:", acaError);
        throw new Error(`Audit Log Error: ${acaError.message}`);
      }

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
              <p className="text-sm text-gray-600">Select the health metrics you wish to sync.</p>

              <div className="max-h-60 overflow-y-auto border p-2 rounded-md bg-gray-50/50 mb-4">
                {Array.from(new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.category))).map((category) => (
                  <div key={category} className="mb-2">
                    <h5 className="font-semibold text-xs text-gray-700 mt-1">{category}</h5>
                    {ALL_HEALTH_DATA_TYPES.filter((d) => d.category === category).map((type) => (
                      <div key={type.id} className="flex items-center space-x-2 text-xs py-1">
                        <Checkbox
                          id={type.id}
                          checked={selectedDataTypes.has(type.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(type.id, !!checked)}
                        />
                        <label htmlFor={type.id} className="text-gray-600 cursor-pointer">
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
              <p className="text-sm text-gray-600">Your metrics are actively syncing to your vault.</p>
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
              <p className="text-sm text-gray-600">Establishing Liability Shield...</p>
            </div>
          )}

          {connectionStatus === "connected" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800 text-lg">Sync Complete!</h3>
              </div>
              {healthData && (
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Footprints className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      {/* Only render if > 0 so we don't show blank zeros if empty */}
                      <div className="text-lg font-bold">
                        {healthData.steps ? healthData.steps.toLocaleString() : "--"}
                      </div>
                      <div className="text-xs text-gray-500">Steps</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">{healthData.heartRate ? healthData.heartRate : "--"}</div>
                      <div className="text-xs text-gray-500">Heart Rate</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <Button onClick={onComplete} className="w-full">
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
