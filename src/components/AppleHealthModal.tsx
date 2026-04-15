import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Zap, Flame, CheckCircle2, AlertCircle } from "lucide-react";
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
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRestingHeartRate", name: "Resting Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", name: "Blood Oxygen", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", name: "Respiratory Rate", category: "Vitals" },
  { id: "HKCategoryTypeIdentifierMindfulSession", name: "Mindful Minutes", category: "Mindfulness" },
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

      setConnectionStatus("connected");
      setIsConnecting(false);
      setJustFinishedSync(true);

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

          if (item.type === "steps" || item.type === "stepCount") {
            totalSteps += val;
          } else if (item.type === "heartRate") {
            hrValues.push(val);
          } else if (
            item.type === "activeEnergyBurned" ||
            item.type === "calories" ||
            item.type === "restingEnergyBurned"
          ) {
            totalCalories += val;
          }
        });

        if (totalSteps > 0) displayData.steps = totalSteps;
        if (totalCalories > 0) displayData.calories = totalCalories;
        if (hrValues.length > 0) {
          displayData.heartRate = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
        }
      }

      setHealthData(displayData);

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

      setTimeout(() => {
        onComplete();
        onClose();
      }, 2500);
    };

    (window as any).onHealthDataSyncError = async (errorMsg: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setErrorMessage(`Sync Error: ${errorMsg}`);
      setConnectionStatus("error");
      setIsConnecting(false);
    };

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      (window as any).onHealthDataSyncComplete = undefined;
      (window as any).onHealthDataSyncError = undefined;
    };
  }, [onComplete, onClose]);

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
          setErrorMessage("Native bridge timeout.");
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
        setErrorMessage("Please launch from the IDIA App.");
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

      await supabase.from("user_aca_records").upsert(
        {
          platform_guid: profile.platform_guid,
          aca_hash_key: hash,
          source_id: "apple_health",
        },
        { onConflict: "aca_hash_key" },
      );

      syncHealthDataViaNativeApp(hash);
    } catch (error: any) {
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, syncHealthDataViaNativeApp]);

  const handleFinalize = () => {
    onComplete();
    onClose();
  };

  const isActuallyConnected = !!existingConnection || justFinishedSync;

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
            <span>{isActuallyConnected ? "Apple Health Linked" : "Connect Apple Health"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isActuallyConnected ? (
            <div className="space-y-4 py-4 animate-in fade-in duration-500">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                  <div>
                    <p className="font-bold text-emerald-900 leading-tight">Identity Anchored</p>
                    <p className="text-xs text-emerald-700">Liability Shield Active</p>
                  </div>
                </div>
              </div>

              {healthData && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-slate-50 border-none shadow-none text-center p-2">
                    <Footprints className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                    <div className="text-lg font-bold leading-none">{healthData.steps || "--"}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Steps</div>
                  </Card>
                  <Card className="bg-slate-50 border-none shadow-none text-center p-2">
                    <Heart className="w-4 h-4 mx-auto text-red-500 mb-1" />
                    <div className="text-lg font-bold leading-none">{healthData.heartRate || "--"}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight">BPM</div>
                  </Card>
                  <Card className="bg-slate-50 border-none shadow-none text-center p-2">
                    <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                    <div className="text-lg font-bold leading-none">
                      {healthData.calories ? Math.round(healthData.calories) : "--"}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Kcal</div>
                  </Card>
                </div>
              )}
              <Button onClick={handleFinalize} className="w-full h-12 rounded-xl text-lg font-bold">
                Done
              </Button>
            </div>
          ) : (
            <>
              {connectionStatus === "connecting" ? (
                <div className="text-center py-10">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground animate-pulse font-medium">
                    Synchronizing Sovereign Data...
                  </p>
                </div>
              ) : connectionStatus === "error" ? (
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                    <AlertCircle className="text-red-500 h-5 w-5" />
                    <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
                  </div>
                  <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
                    Retry Bridge
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-60 overflow-y-auto border p-2 rounded-lg bg-muted/30">
                    {ALL_HEALTH_DATA_TYPES.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center space-x-2 text-sm py-2 px-1 hover:bg-white/50 rounded transition-colors"
                      >
                        <Checkbox
                          id={type.id}
                          checked={selectedDataTypes.has(type.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedDataTypes);
                            checked ? newSet.add(type.id) : newSet.delete(type.id);
                            setSelectedDataTypes(newSet);
                          }}
                        />
                        <label htmlFor={type.id} className="flex-1 cursor-pointer font-medium">
                          {type.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleConnect} disabled={isConnecting} className="w-full h-12 rounded-xl font-bold">
                    Initialize Sync
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
