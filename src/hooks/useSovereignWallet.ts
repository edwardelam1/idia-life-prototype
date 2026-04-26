import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSovereignWallet = (userId: string | undefined) => {
  const [globalWalletAddress, setGlobalWalletAddress] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const { toast } = useToast();

  // STEP 1: Fetch global truth on load safely
  useEffect(() => {
    const hydrateSovereignState = async () => {
      if (!userId) {
        console.log("🌐 [HYDRATION_LOG] ABORT: No active userId provided.");
        setIsHydrating(false);
        return;
      }

      console.log(`🌐 [HYDRATION_LOG] START: Querying Supabase for sovereign wallet state. UserID: ${userId}`);
      try {
        // Bypass strict TS typing for the new column using `as any`
        const { data, error } = await supabase
          .from("profiles")
          .select("wallet_address" as any)
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error(`🚨 [HYDRATION_LOG] ERROR_START: Supabase profile query failed.`);
          console.error(`🚨 [HYDRATION_LOG] ERROR_DETAILS: ${error.message}`);
          console.error(`🚨 [HYDRATION_LOG] ERROR_END: Hydration terminated.`);
          throw error;
        }

        const rawData = data as { wallet_address?: string } | null;

        if (rawData && rawData.wallet_address) {
          setGlobalWalletAddress(rawData.wallet_address);
          console.log(`🌐 [HYDRATION_LOG] END: Successfully hydrated global wallet address: ${rawData.wallet_address}`);
        } else {
          console.log(`🌐 [HYDRATION_LOG] END: Profile fetched, but no wallet_address found. User is a blank slate.`);
        }
      } catch (err: any) {
        console.error(`🚨 [HYDRATION_LOG] ERROR_START: Unexpected exception during hydration.`);
        console.error(`🚨 [HYDRATION_LOG] ERROR_DETAILS: ${err.message}`);
        console.error(`🚨 [HYDRATION_LOG] ERROR_END: Catch block executed.`);
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateSovereignState();
  }, [userId]);

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
      // Bypass strict TS typing for the update payload using `as any`
      const updatePayload: any = { wallet_address: newAddress };

      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userId);

      if (error) {
        console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR_START: Supabase update failed.`);
        console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR_DETAILS: ${error.message}`);
        console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR_END: Upsert aborted.`);
        throw error;
      }

      setGlobalWalletAddress(newAddress);
      console.log(`🌐 [SUPABASE_SYNC_LOG] END: Wallet upsert successful. Global state secured.`);
      toast({
        title: "Vault Synced",
        description: "Sovereign identity aligned across all devices.",
      });
    } catch (err: any) {
      console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR_START: Unexpected exception during wallet upsert.`);
      console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR_DETAILS: ${err.message}`);
      console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR_END: Catch block executed.`);
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
