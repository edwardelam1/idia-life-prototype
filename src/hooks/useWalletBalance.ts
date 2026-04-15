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
    // 1. Fetch initial balance
    fetchBalance();

    // 2. FINANCIAL GRADE REAL-TIME SYNC
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all updates
          schema: "public",
          table: "user_wallets",
        },
        (payload) => {
          console.log("Real-time wallet update received:", payload);

          // FIX: Safely cast payload.new so TypeScript knows the properties exist
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    balance,
    loading,
    refreshBalance: fetchBalance,
  };
};
