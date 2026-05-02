/**
 * EVM Wallet Service for IDIA Life.
 * Supports: wallet creation, seed phrase import, viewing, network switching,
 * balance display, transaction signing with user confirmation flow.
 */

import { ethers } from 'ethers';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  blockExplorer: string;
  isTestnet: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  coston2: {
    name: 'Flare Testnet Coston2',
    chainId: 114,
    rpcUrl: 'https://coston2-api.flare.network/ext/C/rpc',
    symbol: 'C2FLR',
    blockExplorer: 'https://coston2-explorer.flare.network',
    isTestnet: true,
  },
  flare: {
    name: 'Flare',
    chainId: 14,
    rpcUrl: 'https://flare-api.flare.network/ext/C/rpc',
    symbol: 'FLR',
    blockExplorer: 'https://flare-explorer.flare.network',
    isTestnet: false,
  },
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    symbol: 'ETH',
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'MATIC',
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
  },
};

const DEFAULT_NETWORK = 'coston2';

export interface WalletInfo {
  address: string;
  activeNetwork: string;
}

export interface BalanceInfo {
  balance: string;
  balanceFormatted: string;
  symbol: string;
  network: string;
}

export interface TxRequest {
  to: string;
  amount: string;
  data?: string;
}

export interface TxResult {
  hash: string;
  from: string;
  to: string;
  amount: string;
  network: string;
  blockExplorerUrl: string;
}

const KEYS = {
  MNEMONIC: 'idia_wallet_mnemonic',
  EXISTS: 'idia_wallet_exists',
  NETWORK: 'idia_wallet_network',
} as const;

class WalletService {
  private wallet: ethers.HDNodeWallet | null = null;
  private activeNetwork = DEFAULT_NETWORK;

  async hasWallet(): Promise<boolean> {
    try { const { value } = await SecureStoragePlugin.get({ key: KEYS.EXISTS }); return value === 'true'; } catch { return false; }
  }

  async createWallet(): Promise<{ address: string; mnemonic: string }> {
    const w = ethers.Wallet.createRandom();
    const mnemonic = w.mnemonic?.phrase;
    if (!mnemonic) throw new Error('Failed to generate mnemonic');
    await storeSecureKeys(mnemonic);
    this.wallet = w as ethers.HDNodeWallet;
    this.activeNetwork = DEFAULT_NETWORK;
    this.wallet = w as ethers.HDNodeWallet;
    this.activeNetwork = DEFAULT_NETWORK;
    return { address: w.address, mnemonic };
  }

  async importWallet(mnemonic: string): Promise<{ address: string }> {
    const trimmed = mnemonic.trim();
    if (!ethers.Mnemonic.isValidMnemonic(trimmed)) throw new Error('Invalid mnemonic');
    const w = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(trimmed));
    await storeSecureKeys(trimmed);
    this.wallet = w;
    this.activeNetwork = DEFAULT_NETWORK;
    return { address: w.address };
  }

  async loadWallet(): Promise<WalletInfo | null> {
    try {
      const { value: mnemonic } = await SecureStoragePlugin.get({ key: KEYS.MNEMONIC });
      if (!mnemonic) return null;
      this.wallet = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(mnemonic));
      try { const { value: net } = await SecureStoragePlugin.get({ key: KEYS.NETWORK }); if (net && NETWORKS[net]) this.activeNetwork = net; } catch {}
      return { address: this.wallet.address, activeNetwork: this.activeNetwork };
    } catch { return null; }
  }

  getAddress(): string | null { return this.wallet?.address || null; }

  async getSeedPhrase(): Promise<string | null> {
    try { const { value } = await SecureStoragePlugin.get({ key: KEYS.MNEMONIC }); return value || null; } catch { return null; }
  }

  async deleteWallet(): Promise<void> {
    this.wallet = null;
    this.activeNetwork = DEFAULT_NETWORK;
    try { await SecureStoragePlugin.remove({ key: KEYS.MNEMONIC }); } catch {}
    try { await SecureStoragePlugin.remove({ key: KEYS.EXISTS }); } catch {}
    try { await SecureStoragePlugin.remove({ key: KEYS.NETWORK }); } catch {}
  }

  getActiveNetwork(): NetworkConfig { return NETWORKS[this.activeNetwork]; }
  getActiveNetworkKey(): string { return this.activeNetwork; }

  async switchNetwork(networkKey: string): Promise<NetworkConfig> {
    if (!NETWORKS[networkKey]) throw new Error(`Unknown network: ${networkKey}`);
    this.activeNetwork = networkKey;
    try { await SecureStoragePlugin.set({ key: KEYS.NETWORK, value: networkKey }); } catch {}
    return NETWORKS[networkKey];
  }

  private getProvider(networkKey?: string): ethers.JsonRpcProvider {
    const net = NETWORKS[networkKey || this.activeNetwork];
    return new ethers.JsonRpcProvider(net.rpcUrl);
  }

  async getBalance(networkKey?: string): Promise<BalanceInfo | null> {
    if (!this.wallet) return null;
    const net = NETWORKS[networkKey || this.activeNetwork];
    const provider = this.getProvider(networkKey);
    try {
      const wei = await provider.getBalance(this.wallet.address);
      return { balance: wei.toString(), balanceFormatted: ethers.formatEther(wei), symbol: net.symbol, network: net.name };
    } catch (e) { console.error('Balance fetch failed:', e); return null; }
  }

  async estimateTransaction(req: TxRequest): Promise<{ gasFeeFormatted: string; totalCostFormatted: string; symbol: string; network: string; } | null> {
    if (!this.wallet) return null;
    const net = NETWORKS[this.activeNetwork];
    const provider = this.getProvider();
    try {
      const amountWei = ethers.parseEther(req.amount);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasLimit = await provider.estimateGas({ from: this.wallet.address, to: req.to, value: amountWei, data: req.data });
      const gasFeeWei = gasPrice * gasLimit;
      return {
        gasFeeFormatted: ethers.formatEther(gasFeeWei),
        totalCostFormatted: ethers.formatEther(amountWei + gasFeeWei),
        symbol: net.symbol,
        network: net.name,
      };
    } catch (e) { console.error('Estimate failed:', e); return null; }
  }

  async sendTransaction(req: TxRequest): Promise<TxResult> {
    if (!this.wallet) throw new Error('No wallet');
    if (!ethers.isAddress(req.to)) throw new Error('Invalid recipient address');
    const net = NETWORKS[this.activeNetwork];
    const provider = this.getProvider();
    const signer = this.wallet.connect(provider);
    const tx = await signer.sendTransaction({ to: req.to, value: ethers.parseEther(req.amount), data: req.data });
    await tx.wait();
    return {
      hash: tx.hash,
      from: this.wallet.address,
      to: req.to,
      amount: req.amount,
      network: net.name,
      blockExplorerUrl: `${net.blockExplorer}/tx/${tx.hash}`,
    };
  }
}

export const walletService = new WalletService();
