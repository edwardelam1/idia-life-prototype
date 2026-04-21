import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WalletBalance {
  cash_balance: number;
  idia_usd_balance: number;
  idia_token_balance: number;
  total_earned: number;
}

export const useWalletBalance = () => {
  const [balance, setBalance] = useState<WalletBalance>({
    cash_balance: 0,
    idia_usd_balance: 0,
    idia_token_balance: 0,
    total_earned: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: walletData } = await supabase.from("user_wallets").select("*").eq("user_id", user.id).maybeSingle();

      if (walletData) {
        setBalance({
          cash_balance: walletData.cash_balance || 0,
          idia_usd_balance: walletData.idia_beta_balance || 0,
          idia_token_balance: 0,
          total_earned: walletData.total_earned || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch initial balance first
      await fetchBalance();

      // 2. FINANCIAL GRADE REAL-TIME SYNC
      // DISCUSSION: Use a unique channel string and explicitly filter by the authenticated user
      channel = supabase
        .channel(`wallet-sync-${user.id}-${Math.random()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_wallets",
            filter: `user_id=eq.${user.id}`, // Fix: Explicit RLS pass-through
          },
          (payload) => {
            console.log("Real-time wallet update received:", payload);

            if (payload.new && Object.keys(payload.new).length > 0) {
              const newData = payload.new as Record<string, any>;

              setBalance({
                cash_balance: newData.cash_balance || 0,
                idia_usd_balance: newData.idia_beta_balance || 0,
                idia_token_balance: 0,
                total_earned: newData.total_earned || 0,
              });
            }
          },
        )
        // DISCUSSION: Added explicit status logging to catch connection failures
        .subscribe((status, err) => {
          console.log("Realtime Wallet Channel Status:", status);
          if (err) console.error("Realtime Wallet Channel Error:", err);
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    balance,
    loading,
    refreshBalance: fetchBalance,
  };
};
