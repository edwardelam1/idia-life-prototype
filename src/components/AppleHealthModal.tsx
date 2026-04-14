import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Heart, Footprints, Moon, Zap, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";
import { eventTracker } from "@/utils/EventTracker";
// Mandatory utility for DELT Protocol compliance
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
  // ... other types truncated for brevity, keep your full list in implementation
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

  // Initialize Session and User
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

  // Native App Callback Registry
  useEffect(() => {
    (window as any).onHealthDataSyncComplete = (serverResponse: any) => {
      const data = serverResponse?.health_data || serverResponse || {};
      setHealthData(data);
      setConnectionStatus("connected");
      setIsConnecting(false);
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

  /**
   * DELT Protocol: Flattened Native Bridge Payload
   * Passes the mandatory aca_hash anchor to the iOS wrapper
   */
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

        // COMPLIANCE: Flattened structure (No config nesting)
        const comprehensiveHealthRequest = {
          action: "comprehensive_health_sync",
          user_id: currentUserId,
          aca_hash: hash, // The mandatory audit anchor
          auth_token: authSession?.access_token,
          endpoint: "https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/apple-health-sync",
          requestedDataTypes: requestedTypesByCategory,
        };

        webkit.messageHandlers.syncHealthData.postMessage(comprehensiveHealthRequest);
      } else {
        setErrorMessage("HealthKit sync unavailable. Launch from the native iOS app.");
        setConnectionStatus("error");
        setIsConnecting(false);
      }
    },
    [selectedDataTypes, currentUserId, authSession],
  );

  /**
   * Mandatory Protocol Implementation
   * 1. Fetches platform_guid
   * 2. Mints ACA Hash
   * 3. Logs Transaction to user_aca_records
   * 4. Triggers Sync
   */
  const handleConnect = useCallback(async () => {
    setErrorMessage(null);
    setIsConnecting(true);
    setConnectionStatus("connecting");

    if (!currentUserId) return;

    try {
      // 1. Fetch Registered Platform GUID
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", currentUserId)
        .single();

      if (profileError || !profile?.platform_guid) {
        throw new Error("No platform_guid registered. Audit failed.");
      }

      // 2. Generate Mandatory ACA Hash (Liability Shield Anchor)
      const { hash, payload } = await generateACAHash(profile.platform_guid, "apple_health", [
        "HEALTH_DATA_READ",
        "KYC_VAULT",
      ]);
      setAcaHash(hash);

      // 3. Log Mandatory Transaction Record (Pre-Egress Audit)
      const { error: acaError } = await supabase.from("user_aca_records").insert({
        platform_guid: profile.platform_guid,
        aca_hash_key: hash,
        source_id: "apple_health",
        consent_scope: payload.consent_scope,
      });

      if (acaError) throw new Error("DELT Protocol: Audit insertion failed.");

      // 4. Initialize Connection State
      await supabase.from("data_connections").upsert(
        {
          user_id: currentUserId,
          connection_type: "apple_health",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,connection_type" },
      );

      // 5. Trigger Native Egress
      syncHealthDataViaNativeApp(hash);
    } catch (error: any) {
      setErrorMessage(error.message);
      setConnectionStatus("error");
      setIsConnecting(false);
    }
  }, [currentUserId, authSession, syncHealthDataViaNativeApp]);

  // UI Components remain largely similar but with updated branding
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span>{existingConnection ? "Apple Health" : "Liability Shield: Apple Health"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          {connectionStatus === "idle" && !existingConnection && (
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                Mandatory DELT Protocol Connection
              </p>
              <div className="max-h-60 overflow-y-auto border p-2 rounded-md bg-secondary/20">
                {/* Checkbox mapping logic here */}
              </div>
              <Button onClick={handleConnect} className="w-full" disabled={isConnecting}>
                {isConnecting ? "Generating Shield..." : "Authorize & Connect"}
              </Button>
            </>
          )}

          {/* ... Other status blocks (connecting, connected, etc.) ... */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppleHealthModal;
