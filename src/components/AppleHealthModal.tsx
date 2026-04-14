import { useState, useEffect, useCallback, useRef } from "react";
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
  { id: "HKQuantityTypeIdentifierHeartRate", name: "Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierRestingHeartRate", name: "Resting Heart Rate", category: "Vitals" },
  { id: "HKQuantityTypeIdentifierBodyMass", name: "Weight", category: "Body" },
  { id: "HKCategoryTypeIdentifierMindfulSession", name: "Mindful Minutes", category: "Mindfulness" },
  // ... (Full list from previous implementation)
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const data = serverResponse?.health_data || serverResponse || {};
      setHealthData(data);
      setConnectionStatus("connected");
      setIsConnecting(false);
    };

    (window as any).onHealthDataSyncError = (errorMsg: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setErrorMessage(`HealthKit Sync Error: ${errorMsg}`);
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
          setErrorMessage("Connection timed out. Check device permissions.");
          setConnectionStatus("error");
          setIsConnecting(false);
        }, 15000);

        const comprehensiveHealthRequest = {
          action: "comprehensive_health_sync",
          config: {
            endpoint: "https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync",
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

      if (!profile?.platform_guid) throw new Error("Profile anchor not found.");

      const { hash } = await generateACAHash(profile.platform_guid, "apple_health");

      await supabase.from("user_aca_records").insert({
        platform_guid: profile.platform_guid,
        aca_hash_key: hash,
        source_id: "apple_health",
      });

      await supabase.from("data_connections").upsert({
        user_id: currentUserId,
        connection_type: "apple_health",
        connection_name: "Apple Health",
        is_active: true,
      });

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

          {/* IDLE & NOT CONNECTED */}
          {connectionStatus === "idle" && !existingConnection && (
            <>
              <p className="text-sm text-gray-600">Connect your health data to earn rewards.</p>
              <div className="max-h-60 overflow-y-auto border p-2 rounded-md bg-gray-50/50">
                {/* ... (Checkbox list) ... */}
              </div>
              <Button onClick={handleConnect} className="w-full" disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Apple Health"}
              </Button>
            </>
          )}

          {/* IDLE & ALREADY CONNECTED (Fixes the Blank Screen) */}
          {existingConnection && connectionStatus === "idle" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-green-800">Apple Health Connected</h3>
              <p className="text-sm text-gray-600">Your health metrics are actively syncing.</p>
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

          {/* CONNECTING STATE */}
          {connectionStatus === "connecting" && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Establishing secure connection...</p>
            </div>
          )}

          {/* SUCCESS STATE */}
          {connectionStatus === "connected" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800 text-lg">Sync Successful!</h3>
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
              <Button onClick={onComplete} className="w-full">
                Done
              </Button>
            </div>
          )}

          {/* ERROR STATE */}
          {connectionStatus === "error" && (
            <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
              Retry Connection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
