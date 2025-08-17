import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    total_earned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch from user_wallets table
      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletData) {
        setBalance({
          cash_balance: 0,
          idia_usd_balance: walletData.idia_usd_balance || 0,
          idia_token_balance: 0,
          total_earned: walletData.total_earned || 0
        });
      } else {
        // No wallet record found – default to zeros (no simulated data)
        setBalance({
          cash_balance: 0,
          idia_usd_balance: 0,
          idia_token_balance: 0,
          total_earned: 0
        });
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = () => {
    setLoading(true);
    fetchBalance();
  };

  return {
    balance,
    loading,
    refreshBalance
  };
};