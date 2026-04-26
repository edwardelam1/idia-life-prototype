import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSovereignWallet = (userId: string | undefined) => {
  const [globalWalletAddress, setGlobalWalletAddress] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log("🔄 [SOVEREIGN_SYNC_LOG] START: Initializing Hook Lifecycle.");

    if (!userId) {
      console.log("🔄 [SOVEREIGN_SYNC_LOG] ABORT: No userId provided. Standing by.");
      setIsHydrating(false);
      return;
    }

    let channel: any;

    const initializeSovereignState = async () => {
      console.log(`🌐 [HYDRATION_LOG] START: Fetching global truth for UserID: ${userId}`);

      try {
        // Step 1: Initial Fetch of the Sovereign state
        const { data, error } = await supabase
          .from("profiles")
          .select("wallet_address" as any)
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("🚨 [HYDRATION_LOG] ERROR_START: Supabase query failed.");
          console.error("🚨 [HYDRATION_LOG] ERROR_DETAILS:", error.message);
          console.error("🚨 [HYDRATION_LOG] ERROR_END: Hydration stalled.");
          throw error;
        }

        const rawData = data as { wallet_address?: string } | null;
        if (rawData?.wallet_address) {
          setGlobalWalletAddress(rawData.wallet_address);
          console.log(`🌐 [HYDRATION_LOG] END: Successfully hydrated global state: ${rawData.wallet_address}`);
        } else {
          console.log("🌐 [HYDRATION_LOG] END: Profile exists but wallet is empty. Awaiting first-time connection.");
        }

        // Step 2: Establish Realtime Subscription (Cross-Device Bridge)
        console.log(`📡 [REALTIME_LOG] START: Creating Realtime Channel for UserID: ${userId}`);

        channel = supabase
          .channel(`sovereign-vault-sync-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${userId}`,
            },
            (payload) => {
              console.log("📡 [REALTIME_LOG] DATA_RECEIVED: Remote Profile Update Detected.", payload);
              const updatedAddress = (payload.new as any).wallet_address;

              if (updatedAddress && updatedAddress !== globalWalletAddress) {
                setGlobalWalletAddress(updatedAddress);
                console.log(`📡 [REALTIME_LOG] ACTION: Local state synced with remote address: ${updatedAddress}`);
                toast({
                  title: "Identity Synced",
                  description: "Vault detected from another device.",
                });
              }
            },
          )
          .subscribe((status) => {
            console.log(`📡 [REALTIME_LOG] STATUS_UPDATE: Channel is now [${status}]`);
          });
      } catch (err: any) {
        console.error("🚨 [HYDRATION_LOG] FATAL: Unexpected exception in initializeSovereignState.");
        console.error("🚨 [HYDRATION_LOG] ERROR_DETAILS:", err.message);
      } finally {
        setIsHydrating(false);
      }
    };

    initializeSovereignState();

    return () => {
      console.log("🔄 [SOVEREIGN_SYNC_LOG] CLEANUP: Removing Realtime Channel.");
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, toast]); // Dependency on userId ensures re-hydration on login/switch

  // STEP 2: Upsert when a new connection occurs
  const syncWalletToSupabase = async (newAddress: string) => {
    if (!userId) {
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR: Cannot sync wallet. Missing userId.");
      return;
    }

    console.log(
      `🌐 [SUPABASE_SYNC_LOG] START: Attempting to upsert wallet address ${newAddress} for UserID: ${userId}`,
    );

    try {
      const updatePayload: any = { wallet_address: newAddress };

      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userId);

      if (error) {
        console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_START: Supabase update failed.");
        console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_DETAILS:", error.message);
        console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_END: Upsert aborted.");
        throw error;
      }

      setGlobalWalletAddress(newAddress);
      console.log("🌐 [SUPABASE_SYNC_LOG] END: Global state secured in Supabase.");

      toast({
        title: "Vault Synced",
        description: "Sovereign identity aligned across all devices.",
      });
    } catch (err: any) {
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_START: Fatal sync failure.");
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_DETAILS:", err.message);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Failed to align cross-device reality.",
      });
    }
  };

  return {
    globalWalletAddress,
    isHydrating,
    syncWalletToSupabase,
  };
};
