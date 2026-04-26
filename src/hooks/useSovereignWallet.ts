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
        const { data, error } = await supabase
          .from("profiles")
          .select("wallet_address" as any)
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("🚨 [HYDRATION_LOG] ERROR_START: Supabase query failed.");
          console.error("🚨 [HYDRATION_LOG] ERROR_DETAILS:", error.message);
          throw error;
        }

        const rawData = data as { wallet_address?: string } | null;
        if (rawData?.wallet_address) {
          setGlobalWalletAddress(rawData.wallet_address);
          console.log(`🌐 [HYDRATION_LOG] END: Successfully hydrated global state: ${rawData.wallet_address}`);
        } else {
          console.log("🌐 [HYDRATION_LOG] END: Profile exists but wallet is empty.");
        }

        channel = supabase
          .channel(`sovereign-vault-sync-${userId}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
            (payload) => {
              console.log("📡 [REALTIME_LOG] DATA_RECEIVED: Remote Profile Update Detected.", payload);
              const updatedAddress = (payload.new as any).wallet_address;
              if (updatedAddress && updatedAddress !== globalWalletAddress) {
                setGlobalWalletAddress(updatedAddress);
                toast({ title: "Identity Synced", description: "Vault detected from another device." });
              }
            },
          )
          .subscribe((status) => {
            console.log(`📡 [REALTIME_LOG] STATUS_UPDATE: Channel is now [${status}]`);
          });
      } catch (err: any) {
        console.error("🚨 [HYDRATION_LOG] FATAL: Unexpected exception during hydration.");
      } finally {
        setIsHydrating(false);
      }
    };

    initializeSovereignState();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const syncWalletToSupabase = async (newAddress: string) => {
    if (!userId) {
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR: Cannot sync wallet. Missing userId.");
      return;
    }

    console.log(`\n🌐 [SUPABASE_SYNC_LOG] START: Attempting to commit wallet ${newAddress} for UserID: ${userId}`);

    try {
      // SURGICAL FIX: Use upsert to handle missing rows and force commitment
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          wallet_address: newAddress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (error) {
        console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_START: Supabase commitment failed.");
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
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_START: Fatal sync failure.");
      console.error("🚨 [SUPABASE_SYNC_LOG] ERROR_DETAILS:", err.message);
      throw err;
    }
  };

  return { globalWalletAddress, isHydrating, syncWalletToSupabase };
};
