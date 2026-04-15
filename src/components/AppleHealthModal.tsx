import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Zap, Flame, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";
import { generateACAHash } from "@/utils/acaGenerator";
import { Badge } from "@/components/ui/badge";

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingConnection?: any;
  onDisconnect?: () => void;
}

const ALL_HEALTH_DATA_TYPES = [
  { id: "steps", label: "Step Count", icon: Footprints, category: "Activity" },
  { id: "heartRate", label: "Heart Rate", icon: Heart, category: "Vitals" },
  { id: "activeEnergyBurned", label: "Calories", icon: Flame, category: "Activity" },
  { id: "sleepAnalysis", label: "Sleep", icon: Zap, category: "Sleep" },
];

const AppleHealthModal = ({ isOpen, onClose, onComplete, existingConnection, onDisconnect }: AppleHealthModalProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [justFinishedSync, setJustFinishedSync] = useState(false); // 🚨 Local state lock
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

      const displayData: any = {};
      const count = serverResponse?.processed_count || 0;
      setSyncCount(count);

      // Parse summaries
      if (serverResponse?.steps !== undefined) displayData.steps = serverResponse.steps;
      if (serverResponse?.heartRate !== undefined) displayData.heartRate = serverResponse.heartRate;
      if (serverResponse?.calories !== undefined) displayData.calories = serverResponse.calories;

      setHealthData(displayData);
      setConnectionStatus("connected");
      setJustFinishedSync(true); // 🚨 Lock the state locally
      setIsConnecting(false);

      // Removed automatic onClose() call to prevent parent race condition
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

  const handleFinalize = () => {
    onComplete(); // Tells parent to refresh data
    onClose(); // Closes the modal
  };

  const isConnected = !!existingConnection || justFinishedSync;

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
            <span>{isConnected ? "Apple Health Linked" : "Connect Apple Health"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isConnected ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-lg text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">Synapse Linked</p>
                    <p className="text-xs text-emerald-700 font-mono uppercase">Identity Anchored</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500">ACTIVE</Badge>
              </div>

              {healthData && (
                <div className="grid grid-cols-3 gap-2">
                  <Card className="bg-slate-50/50 border-none">
                    <CardContent className="p-3 text-center">
                      <Footprints className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold">{healthData.steps || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Steps</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50/50 border-none">
                    <CardContent className="p-3 text-center">
                      <Heart className="h-4 w-4 mx-auto mb-1 text-red-500" />
                      <p className="text-lg font-bold">{healthData.heartRate || "--"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">BPM</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50/50 border-none">
                    <CardContent className="p-3 text-center">
                      <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                      <p className="text-lg font-bold">{healthData.calories || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Kcal</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Button onClick={handleFinalize} className="w-full h-12 rounded-xl text-lg font-bold">
                Done
              </Button>
            </div>
          ) : connectionStatus === "error" ? (
            <div className="space-y-3 py-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
                  Retry Connection
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full text-slate-500">
                  Close Terminal
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select health metrics to anchor to your Synapse profile:</p>
              <div className="grid grid-cols-1 gap-2">
                {ALL_HEALTH_DATA_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={type.id}
                      checked={selectedDataTypes.has(type.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedDataTypes);
                        if (checked) newSet.add(type.id);
                        else newSet.delete(type.id);
                        setSelectedDataTypes(newSet);
                      }}
                    />
                    <label htmlFor={type.id} className="flex flex-1 items-center gap-3 cursor-pointer">
                      <type.icon size={18} className="text-primary" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </label>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleConnect}
                disabled={isConnecting || selectedDataTypes.size === 0}
                className="w-full h-12 rounded-xl font-bold"
              >
                {isConnecting ? "Establishing Bridge..." : "Initialize Identity Sync"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
