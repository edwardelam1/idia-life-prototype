import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Zap, Flame, AlertCircle } from "lucide-react"; // Added AlertCircle
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";
import { generateACAHash } from "@/utils/acaGenerator";
const [justFinishedSync, setJustFinishedSync] = useState(false);

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

// ... ALL_HEALTH_DATA_TYPES definition remains unchanged ...

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
    // ... existing summary calculation logic ...

    setHealthData(displayData);
    setConnectionStatus("connected");
    setJustFinishedSync(true); // 🚨 LOCK THE STATE
    setIsConnecting(false);

    // REMOVE the automatic timeout. Let the user see the data and click "Done".
  };
}, [onComplete]);

      const displayData: any = {};
      const count = serverResponse?.processed_count || 0;
      setSyncCount(count);

      if (serverResponse?.steps !== undefined) displayData.steps = serverResponse.steps;
      if (serverResponse?.heartRate !== undefined) displayData.heartRate = serverResponse.heartRate;
      if (serverResponse?.calories !== undefined) displayData.calories = serverResponse.calories;

      if (
        Object.keys(displayData).length === 0 &&
        serverResponse?.processed_data &&
        Array.isArray(serverResponse.processed_data)
      ) {
        serverResponse.processed_data.forEach((item: any) => {
          const val = item.value !== undefined ? item.value : 0;
          const dataType = item.type || item.dataType;
          if (dataType === "steps" || dataType === "stepCount") displayData.steps = val;
          if (dataType === "heartRate") displayData.heartRate = val;
          if (dataType === "activeEnergyBurned" || dataType === "calories") displayData.calories = val;
        });
      }

      setHealthData(displayData);
      setConnectionStatus("connected");
      setIsConnecting(false);

      // Closes modal automatically after sync success
      setTimeout(() => {
        onComplete();
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
  }, [onComplete]);

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
          {/* Status mapping logic ... */}
          {connectionStatus === "error" && (
            <div className="space-y-3 py-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
                  Retry Connection
                </Button>
                {/* Manual close button added to break the UI lock */}
                <Button variant="ghost" onClick={onClose} className="w-full">
                  Close Terminal
                </Button>
              </div>
            </div>
          )}

          {/* ... Idle, Connecting, and Connected states remain unchanged ... */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
