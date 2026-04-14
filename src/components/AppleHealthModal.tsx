import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Moon, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";
import { eventTracker } from "@/utils/EventTracker";
import { generateACAHash } from "@/utils/acaGenerator";

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

// Define all 37 data types with their display names and categories
const ALL_HEALTH_DATA_TYPES = [
  // Activity & Movement
  { id: "HKQuantityTypeIdentifierStepCount", name: "Steps", category: "Activity" },
  { id: "HKQuantityTypeIdentifierDistanceWalkingRunning", name: "Distance (Walking/Running)", category: "Activity" },
  { id: "HKQuantityTypeIdentifierDistanceCycling", name: "Distance (Cycling)", category: "Activity" },
  { id: "HKQuantityTypeIdentifierFlightsClimbed", name: "Flights Climbed", category: "Activity" },
  { id: "HKQuantityTypeIdentifierActiveEnergyBurned", name: "Active Energy Burned", category: "Activity" },
  { id: "HKQuantityTypeIdentifierBasalEnergyBurned", name: "Basal Energy Burned", category: "Activity" },
  { id: "HKQuantityTypeIdentifierAppleExerciseTime", name: "Exercise Time", category: "Activity" },
  { id: "HKQuantityTypeIdentifierWalkingSpeed", name: "Walking Speed", category: "Activity" },
  { id: "HKQuantityTypeIdentifierWalkingStepLength", name: "Walking Step Length", category: "Activity" },
  { id: "HKQuantityTypeIdentifierWalkingAsymmetryPercentage", name: "Walking Asymmetry", category: "Activity" },
  { id: "HKQuantityTypeIdentifierWalkingDoubleSupportPercentage", name: "Double Support Time", category: "Activity" },

  // Heart & Vitals (Basic)
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRestingHeartRate", name: "Resting Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", name: "Blood Oxygen", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", name: "Respiratory Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierBodyTemperature", name: "Body Temperature", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierVO2Max", name: "VO2 Max", category: "Vitals" },

  // Body Measurements
  { id: "HKQuantityTypeIdentifierHeight", name: "Height", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyMass", name: "Weight", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyMassIndex", name: "BMI", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyFatPercentage", name: "Body Fat %", category: "Body" },
  { id: "HKQuantityTypeIdentifierLeanBodyMass", name: "Lean Body Mass", category: "Body" },
  { id: "HKQuantityTypeIdentifierWaistCircumference", name: "Waist Circumference", category: "Body" },

  // Nutrition (Basic)
  { id: "HKQuantityTypeIdentifierDietaryEnergyConsumed", name: "Dietary Energy", category: "Nutrition" },
  { id: "HKQuantityTypeIdentifierDietaryFatTotal", name: "Total Fat", category: "Nutrition" },
  { id: "HKQuantityTypeIdentifierDietaryProtein", name: "Protein", category: "Nutrition" },
  { id: "HKQuantityTypeIdentifierDietaryWater", name: "Water Intake", category: "Nutrition" },

  // Other Categories
  { id: "HKCategoryTypeIdentifierMindfulSession", name: "Mindful Minutes", category: "Mindfulness" },
  {
    id: "HKQuantityTypeIdentifierEnvironmentalAudioExposure",
    name: "Environmental Audio Exposure",
    category: "Environment",
  },
  { id: "HKQuantityTypeIdentifierHeadphoneAudioExposure", name: "Headphone Audio Exposure", category: "Environment" },

  // Reproductive Health
  { id: "HKCategoryTypeIdentifierMenstrualFlow", name: "Menstrual Flow", category: "Reproductive" },
  { id: "HKQuantityTypeIdentifierBasalBodyTemperature", name: "Basal Body Temperature", category: "Reproductive" },
  { id: "HKCategoryTypeIdentifierOvulationTestResult", name: "Ovulation Test Result", category: "Reproductive" },
  { id: "HKCategoryTypeIdentifierCervicalMucusQuality", name: "Cervical Mucus Quality", category: "Reproductive" },
  { id: "HKCategoryTypeIdentifierSexualActivity", name: "Sexual Activity", category: "Reproductive" },

  { id: "HKWorkoutTypeIdentifier", name: "Workout Data", category: "Activity" },
  { id: "HKClinicalTypeIdentifier", name: "Clinical Data Indicator", category: "Clinical" },
];

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [acaHash, setAcaHash] = useState<string | null>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        setErrorMessage("Authentication error. Please log in again.");
        return;
      }
      if (session?.user) {
        setCurrentUserId(session.user.id);
        setAuthSession(session);
      } else {
        setErrorMessage("Please log in to connect Apple Health data.");
      }
    };
    getSession();
  }, []);

  // 1. Auto-close timer when connection is successful
  useEffect(() => {
    if (connectionStatus === "connected") {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, onComplete]);

  // 2. Timeout Guard: Prevent infinite spinning if Native App silently aborts
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (connectionStatus === "connecting") {
      timeoutId = setTimeout(() => {
        console.error("DEBUG_UI: Native HealthKit sync timed out after 10 seconds.");
        setErrorMessage("Connection timed out. The native app took too long to respond. Please try again.");
        setConnectionStatus("error");
        setIsConnecting(false);
      }, 10000); // Kills the spinner after 10 seconds
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connectionStatus]);

  // 3. Native App Callbacks
  useEffect(() => {
    (window as any).onHealthDataSyncComplete = (serverResponse: any) => {
      console.log("DEBUG_UI: Web view received sync completion callback from native app.");
      if (serverResponse && typeof serverResponse === "object" && serverResponse.health_data) {
        setHealthData(serverResponse.health_data);
      } else if (serverResponse) {
        setHealthData(serverResponse);
      } else {
        setHealthData({});
      }

      setConnectionStatus("connected");
      setIsConnecting(false);

      eventTracker.trackFeatureUsage({
        feature: "apple_health_connection",
        action: "sync_completed",
        success: true,
      });
    };

    (window as any).onHealthDataSyncError = (errorMsg: string) => {
      console.error("DEBUG_UI: Web view received error callback:", errorMsg);
      setErrorMessage(`HealthKit Sync Error: ${errorMsg}`);
      setConnectionStatus("error");
      setIsConnecting(false);
    };

    const handleCustomSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.success) {
        setConnectionStatus("connected");
        setIsConnecting(false);
      }
    };
    window.addEventListener("healthSyncComplete", handleCustomSyncComplete);

    return () => {
      (window as any).onHealthDataSyncComplete = undefined;
      (window as any).onHealthDataSyncError = undefined;
      window.removeEventListener("healthSyncComplete", handleCustomSyncComplete);
    };
  }, []);

  const handleCheckboxChange = useCallback((id: string, isChecked: boolean) => {
    setSelectedDataTypes((prev) => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const syncHealthDataViaNativeApp = useCallback(() => {
    const webkit = (window as any).webkit;
    if (webkit && webkit.messageHandlers && webkit.messageHandlers.syncHealthData) {
      const requestedTypesByCategory: { [key: string]: string[] } = {};
      ALL_HEALTH_DATA_TYPES.forEach((type) => {
        if (selectedDataTypes.has(type.id)) {
          if (!requestedTypesByCategory[type.category.toLowerCase()]) {
            requestedTypesByCategory[type.category.toLowerCase()] = [];
          }
          requestedTypesByCategory[type.category.toLowerCase()].push(type.id);
        }
      });

      const comprehensiveHealthRequest = {
        action: "comprehensive_health_sync",
        config: {
          endpoint: "https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync",
          user_id: currentUserId,
          auth_token: authSession?.access_token,
        },
        requestedDataTypes: requestedTypesByCategory,
      };

      webkit.messageHandlers.syncHealthData.postMessage(comprehensiveHealthRequest);
    } else {
      setErrorMessage("HealthKit sync is unavailable outside the native iOS app wrapper. Please launch from Xcode.");
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [selectedDataTypes, currentUserId, authSession]);

  const handleDisconnect = useCallback(async () => {
    if (!currentUserId || !existingConnection) return;

    try {
      const { error } = await supabase
        .from("data_connections")
        .update({ is_active: false })
        .eq("id", existingConnection.id)
        .eq("user_id", currentUserId);

      if (!error) {
        onDisconnect?.();
        onClose();
      }
    } catch (error: any) {
      console.error("Error disconnecting Apple Health:", error);
    }
  }, [currentUserId, existingConnection, onDisconnect, onClose]);

  const handleConnect = useCallback(async () => {
    setErrorMessage(null);
    setConnectionStatus("connecting");
    setIsConnecting(true);

    if (!currentUserId || !authSession) {
      setErrorMessage("Please log in to connect Apple Health data.");
      setConnectionStatus("error");
      setIsConnecting(false);
      return;
    }

    try {
      // Step 1: Mandatory DELT Protocol — generate ACA hash
      const { hash, payload } = await generateACAHash(currentUserId, 'apple_health', ['KYC_VAULT', 'WALLET_PROVISIONING']);

      // Step 2: Log mandatory audit record
      const { error: acaError } = await supabase
        .from('user_aca_records')
        .insert({
          platform_guid: currentUserId,
          aca_hash_key: hash,
          source_id: 'apple_health',
          consent_scope: payload.consent_scope,
        });

      if (acaError) {
        throw new Error(`DELT Protocol audit failed: ${acaError.message}`);
      }

      // Store hash for native bridge
      setAcaHash(hash);

      // Step 3: Upsert connection record
      const { error: connectionError } = await supabase
        .from("data_connections")
        .upsert(
          {
            user_id: currentUserId,
            connection_type: "apple_health",
            connection_name: "Apple Health",
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,connection_type",
          },
        )
        .select()
        .single();

      if (connectionError) {
        setErrorMessage(`Failed to initialize connection: ${connectionError.message}`);
        setConnectionStatus("error");
        setIsConnecting(false);
        return;
      }

      // Step 4: Trigger native bridge with ACA hash
      syncHealthDataViaNativeApp();
    } catch (error: any) {
      setErrorMessage(`Connection failed: ${error.message}`);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, authSession, syncHealthDataViaNativeApp, selectedDataTypes]);

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
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          {connectionStatus === "idle" && !existingConnection && (
            <>
              <p className="text-sm text-gray-600">
                Connect your Apple Health data to earn rewards for your fitness activities and health metrics.
              </p>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Select HealthKit Data to Access:</h4>
                <div className="max-h-60 overflow-y-auto border p-2 rounded-md">
                  {Array.from(new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.category))).map((category) => (
                    <div key={category} className="mb-2">
                      <h5 className="font-semibold text-xs text-gray-700 mt-1">{category}</h5>
                      {ALL_HEALTH_DATA_TYPES.filter((d) => d.category === category).map((type) => (
                        <div key={type.id} className="flex items-center space-x-2 text-xs py-1">
                          <Checkbox
                            id={type.id}
                            checked={selectedDataTypes.has(type.id)}
                            onCheckedChange={(checked: boolean) => handleCheckboxChange(type.id, checked)}
                          />
                          <label htmlFor={type.id} className="text-gray-600 cursor-pointer">
                            {type.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  All data is anonymized and encrypted for privacy protection
                </p>
              </div>

              <Button onClick={handleConnect} className="w-full" disabled={isConnecting || !currentUserId}>
                {isConnecting ? "Connecting..." : "Connect Apple Health"}
              </Button>
            </>
          )}

          {existingConnection && connectionStatus === "idle" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Apple Health Connected</h3>
                <p className="text-sm text-gray-600">Your health data is actively earning rewards</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Active Pipeline</p>
                    <p className="text-xs text-green-600">Processing data automatically</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Close
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {connectionStatus === "error" && (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 mb-4">Connection failed or timed out. Please try again.</p>
              <Button
                onClick={() => {
                  setConnectionStatus("idle");
                  setErrorMessage(null);
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}

          {connectionStatus === "connecting" && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Syncing your health data...</p>
            </div>
          )}

          {connectionStatus === "connected" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Successfully Connected!</h3>
                <p className="text-sm text-gray-600">Here's your latest health data:</p>
              </div>

              {healthData && (
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Footprints className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">{healthData.steps?.toLocaleString() || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3 text-center">
                      <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">{healthData.heartRate || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3 text-center">
                      <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">{healthData.activeMinutes || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3 text-center">
                      <Moon className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                      <div className="text-lg font-bold">{healthData.sleepHours || 0}h</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <p className="text-sm text-center text-gray-600">Earning rewards for your health data...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
