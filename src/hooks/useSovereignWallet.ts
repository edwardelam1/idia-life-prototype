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
        // Step 1: Initial Fetch - Using 'id' for the query filter
        const { data, error } = await supabase.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();

        if (error) {
          console.error("🚨 [HYDRATION_LOG] ERROR_START: Supabase query failed.");
          console.error("🚨 [HYDRATION_LOG] ERROR_DETAILS:", error.message);
          throw error;
        }

        if (data?.wallet_address) {
          setGlobalWalletAddress(data.wallet_address);
          console.log(`🌐 [HYDRATION_LOG] END: Successfully hydrated global state: ${data.wallet_address}`);
        } else {
          console.log("🌐 [HYDRATION_LOG] END: Profile exists but wallet is empty.");
        }

        // Step 2: Establish Realtime Subscription
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
              console.log("📡 [REALTIME_LOG] DATA_RECEIVED: Remote Profile Update Detected.");
              const updatedAddress = (payload.new as any).wallet_address;

              if (updatedAddress && updatedAddress !== globalWalletAddress) {
                setGlobalWalletAddress(updatedAddress);
                toast({
                  title: "Identity Synced",
                  description: "Vault detected from another device.",
                });
              }
            },
          )
          .subscribe();
      } catch (err: any) {
        console.error("🚨 [HYDRATION_LOG] FATAL: Unexpected exception.");
      } finally {
        setIsHydrating(false);
      }
    };

    initializeSovereignState();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  // STEP 2: Upsert when a new connection occurs
  const syncWalletToSupabase = async (newAddress: string) => {
    if (!userId) {
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR: Cannot sync wallet. Missing userId.");
      return;
    }

    console.log(`\n🌐 [SUPABASE_SYNC_LOG] START: Committing wallet ${newAddress} for UserID: ${userId}`);

    try {
      /**
       * SURGICAL FIX FOR TS2769:
       * 1. user_id is the logical identifier required for the profiles table.
       * 2. id is used as the conflict target for the upsert logic.
       */
      const payload: any = {
        id: userId,
        user_id: userId, // Required by Database['public']['Tables']['profiles']['Insert']
        wallet_address: newAddress,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

      if (error) {
        console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_DETAILS:", error.message);
        throw error;
      }

      setGlobalWalletAddress(newAddress);
      console.log("🌐 [SUPABASE_SYNC_LOG] END: Global state secured in Supabase.");

      toast({
        title: "Vault Synced",
        description: "Sovereign identity aligned across all devices.",
      });
    } catch (err: any) {
      console.error("🚨 [SUPABASE_SYNC_LOG] FATAL: Sync failure.");
      throw err;
    }
  };

  return {
    globalWalletAddress,
    isHydrating,
    syncWalletToSupabase,
  };
};
