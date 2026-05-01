import { useState, useEffect, useCallback } from 'react';
import {
  walletService,
  NETWORKS,
  type WalletInfo,
  type BalanceInfo,
  type TxRequest,
  type TxResult,
  type NetworkConfig,
} from '@/services/walletService';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const [activeNetwork, setActiveNetwork] = useState<string>(walletService.getActiveNetworkKey());

  const refreshBalance = useCallback(async () => {
    if (!walletService.getAddress()) return;
    setIsBalanceLoading(true);
    try {
      const b = await walletService.getBalance();
      setBalance(b);
    } finally {
      setIsBalanceLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const exists = await walletService.hasWallet();
        setHasWallet(exists);
        if (exists) {
          const info = await walletService.loadWallet();
          setWallet(info);
          if (info) setActiveNetwork(info.activeNetwork);
        }
      } catch (e: any) { setError(e.message); }
      finally { setIsLoading(false); }
    })();
  }, []);

  // Refresh balance when wallet or network changes
  useEffect(() => {
    if (wallet) refreshBalance();
  }, [wallet, activeNetwork, refreshBalance]);

  const createWallet = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const r = await walletService.createWallet();
      setWallet({ address: r.address, activeNetwork: walletService.getActiveNetworkKey() });
      setHasWallet(true);
      setActiveNetwork(walletService.getActiveNetworkKey());
      return r;
    } catch (e: any) { setError(e.message); return null; }
    finally { setIsLoading(false); }
  }, []);

  const importWallet = useCallback(async (mnemonic: string) => {
    setIsLoading(true); setError(null);
    try {
      const r = await walletService.importWallet(mnemonic);
      setWallet({ address: r.address, activeNetwork: walletService.getActiveNetworkKey() });
      setHasWallet(true);
      setActiveNetwork(walletService.getActiveNetworkKey());
      return true;
    } catch (e: any) { setError(e.message); return false; }
    finally { setIsLoading(false); }
  }, []);

  const getSeedPhrase = useCallback(async () => walletService.getSeedPhrase(), []);

  const deleteWallet = useCallback(async () => {
    await walletService.deleteWallet();
    setWallet(null);
    setHasWallet(false);
    setBalance(null);
  }, []);

  const switchNetwork = useCallback(async (networkKey: string) => {
    setError(null);
    try {
      const net = await walletService.switchNetwork(networkKey);
      setActiveNetwork(networkKey);
      setBalance(null);
      return net;
    } catch (e: any) { setError(e.message); return null; }
  }, []);

  const estimateTransaction = useCallback(async (req: TxRequest) => walletService.estimateTransaction(req), []);

  const sendTransaction = useCallback(async (req: TxRequest): Promise<TxResult | null> => {
    setError(null);
    try {
      const result = await walletService.sendTransaction(req);
      setTimeout(refreshBalance, 1500);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [refreshBalance]);

  return {
    wallet,
    hasWallet,
    isLoading,
    error,
    createWallet,
    importWallet,
    getSeedPhrase,
    deleteWallet,
    clearError: useCallback(() => setError(null), []),
    // network
    activeNetwork,
    networks: NETWORKS,
    switchNetwork,
    activeNetworkConfig: NETWORKS[activeNetwork] as NetworkConfig,
    // balance
    balance,
    isBalanceLoading,
    refreshBalance,
    // transactions
    estimateTransaction,
    sendTransaction,
  };
}