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

const ALL_HEALTH_DATA_TYPES = [
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
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRestingHeartRate", name: "Resting Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", name: "Blood Oxygen", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", name: "Respiratory Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierBodyTemperature", name: "Body Temperature", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierVO2Max", name: "VO2 Max", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierHeight", name: "Height", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyMass", name: "Weight", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyMassIndex", name: "BMI", category: "Body" },
  { id: "HKQuantityTypeIdentifierBodyFatPercentage", name: "Body Fat %", category: "Body" },
  { id: "HKQuantityTypeIdentifierLeanBodyMass", name: "Lean Body Mass", category: "Body" },
  { id: "HKQuantityTypeIdentifierWaistCircumference", name: "Waist Circumference", category: "Body" },
  { id: "HKQuantityTypeIdentifierDietaryEnergyConsumed", name: "Dietary Energy", category: "Nutrition" },
  { id: "HKQuantityTypeIdentifierDietaryFatTotal", name: "Total Fat", category: "Nutrition" },
  { id: "HKQuantityTypeIdentifierDietaryProtein", name: "Protein", category: "Nutrition" },
  { id: "HKQuantityTypeIdentifierDietaryWater", name: "Water Intake", category: "Nutrition" },
  { id: "HKCategoryTypeIdentifierMindfulSession", name: "Mindful Minutes", category: "Mindfulness" },
  {
    id: "HKQuantityTypeIdentifierEnvironmentalAudioExposure",
    name: "Environmental Audio Exposure",
    category: "Environment",
  },
  { id: "HKQuantityTypeIdentifierHeadphoneAudioExposure", name: "Headphone Audio Exposure", category: "Environment" },
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
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(ALL_HEALTH_DATA_TYPES.map((d) => d.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    (window as any).onHealthDataSyncComplete = (serverResponse: any) => {
      const data = serverResponse?.health_data || serverResponse || {};
      setHealthData(data);
      setConnectionStatus("connected");
      setIsConnecting(false);
      eventTracker.trackFeatureUsage({
        feature: "apple_health_connection",
        action: "sync_completed",
        success: true,
      });
    };

    (window as any).onHealthDataSyncError = (errorMsg: string) => {
      setErrorMessage(`HealthKit Sync Error: ${errorMsg}`);
      setConnectionStatus("error");
      setIsConnecting(false);
    };

    return () => {
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

        const comprehensiveHealthRequest = {
          action: "comprehensive_health_sync",
          user_id: currentUserId,
          aca_hash: hash,
          auth_token: authSession?.access_token,
          endpoint: "https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync",
          requestedDataTypes: requestedTypesByCategory,
        };

        webkit.messageHandlers.syncHealthData.postMessage(comprehensiveHealthRequest);
      } else {
        setErrorMessage("Launch from native iOS app to sync.");
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
      // 1. Database-First Verification (Fetch Anchor)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .single();

      if (profileError || !profile?.platform_guid) {
        throw new Error("Profile anchor not found. Please contact support.");
      }

      // 2. Background Protocol Execution
      const { hash, payload } = await generateACAHash(profile.platform_guid, "apple_health");

      const { error: acaError } = await supabase.from("user_aca_records").insert({
        platform_guid: profile.platform_guid,
        aca_hash_key: hash,
        source_id: "apple_health",
        consent_scope: payload.consent_scope,
      });

      if (acaError) throw new Error("Audit log failed.");

      await supabase.from("data_connections").upsert(
        {
          user_id: currentUserId,
          connection_type: "apple_health",
          connection_name: "Apple Health",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,connection_type" },
      );

      // 3. Trigger Egress
      syncHealthDataViaNativeApp(hash);
    } catch (error: any) {
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, authSession, syncHealthDataViaNativeApp]);

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
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          {connectionStatus === "idle" && !existingConnection && (
            <>
              <p className="text-sm text-gray-600">Connect your Apple Health data to earn rewards.</p>
              <div className="max-h-60 overflow-y-auto border p-2 rounded-md">
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

          {connectionStatus === "connecting" && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                </div>
              )}
              <Button onClick={onClose} className="w-full">
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
