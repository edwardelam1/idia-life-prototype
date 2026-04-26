import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSovereignWallet = (userId: string | undefined) => {
    const [globalWalletAddress, setGlobalWalletAddress] = useState<string | null>(null);
    const [isHydrating, setIsHydrating] = useState(true);
    const { toast } = useToast();

    // STEP 1: Fetch global truth on load
    useEffect(() => {
        const hydrateSovereignState = async () => {
            if (!userId) {
                console.log("🌐 [HYDRATION_LOG] ABORT: No active userId provided.");
                setIsHydrating(false);
                return;
            }

            console.log(`🌐 [HYDRATION_LOG] START: Querying Supabase for sovereign wallet state. UserID: ${userId}`);
            try {
                // Adjust 'profiles' or 'wallet_address' to match your exact Supabase schema
                const { data, error } = await supabase
                    .from('profiles')
                    .select('wallet_address')
                    .eq('id', userId)
                    .single();

                if (error) {
                    console.error(`🚨 [HYDRATION_LOG] ERROR: Supabase profile query failed. Details: ${error.message}`);
                    throw error;
                }

                if (data && data.wallet_address) {
                    setGlobalWalletAddress(data.wallet_address);
                    console.log(`🌐 [HYDRATION_LOG] END: Successfully hydrated global wallet address: ${data.wallet_address}`);
                } else {
                    console.log(`🌐 [HYDRATION_LOG] END: Profile fetched, but no wallet_address found. User is a blank slate.`);
                }
            } catch (err: any) {
                console.error(`🚨 [HYDRATION_LOG] FATAL: Unexpected exception during hydration: ${err.message}`);
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

        console.log(`🌐 [SUPABASE_SYNC_LOG] START: Attempting to upsert wallet address ${newAddress} for UserID: ${userId}`);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ wallet_address: newAddress })
                .eq('id', userId);

            if (error) {
                console.error(`🚨 [SUPABASE_SYNC_LOG] ERROR: Supabase update failed. Details: ${error.message}`);
                throw error;
            }

            setGlobalWalletAddress(newAddress);
            console.log(`🌐 [SUPABASE_SYNC_LOG] END: Wallet upsert successful. Global state secured.`);
            toast({
                title: "Wallet Synced",
                description: "Sovereign identity aligned across all devices.",
            });
        } catch (err: any) {
            console.error(`🚨 [SUPABASE_SYNC_LOG] FATAL: Unexpected exception during wallet upsert: ${err.message}`);
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
        syncWalletToSupabase
    };
};