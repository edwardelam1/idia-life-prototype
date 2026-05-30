/**
 * useChainReceiveWatcher — polls Base RPC for the connected wallet's
 * ETH, IDIA, and USDC balances and fires `onReceive` when any balance
 * increases. First-run baselines silently (never fires on initial load).
 */
import { useEffect, useRef } from "react";
import { ethers } from "ethers";
import { PROTOCOL } from "@/config/contracts";

const USDC_ADDRESS = PROTOCOL.usdc;
const IDIA_ADDRESS = PROTOCOL.idiaToken;

const resolveBaseRpc = (): string => {
  const raw = (import.meta as any).env?.VITE_ALCHEMY_RPC_URL;
  if (typeof raw === "string" && /^https:\/\/\S+$/.test(raw.trim())) return raw.trim();
  return "https://mainnet.base.org";
};

const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];
const POLL_MS = 30_000;
const RPC_DELAY_MS = 400;

export type ChainAsset = "ETH" | "IDIA" | "USDC";

export interface ChainReceipt {
  asset: ChainAsset;
  amount: number;
  address: string;
  observed_at: string;
}

interface BalanceSnapshot {
  eth: number;
  idia: number;
  usdc: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const readSeen = (address: string): BalanceSnapshot | null => {
  try {
    const raw = localStorage.getItem(`idia_chain_seen_v1:${address.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.eth === "number" && typeof parsed?.idia === "number" && typeof parsed?.usdc === "number") {
      return parsed;
    }
  } catch {}
  return null;
};

const writeSeen = (address: string, snap: BalanceSnapshot) => {
  try {
    localStorage.setItem(`idia_chain_seen_v1:${address.toLowerCase()}`, JSON.stringify(snap));
  } catch {}
};

export function useChainReceiveWatcher(
  walletAddress: string | null | undefined,
  onReceive: (receipt: ChainReceipt) => void,
) {
  const onReceiveRef = useRef(onReceive);
  useEffect(() => {
    onReceiveRef.current = onReceive;
  }, [onReceive]);

  useEffect(() => {
    if (!walletAddress || !walletAddress.startsWith("0x")) return;

    let cancelled = false;
    const address = walletAddress;
    let previous: BalanceSnapshot | null = readSeen(address);

    const provider = new ethers.JsonRpcProvider(resolveBaseRpc(), ethers.Network.from(8453), {
      staticNetwork: ethers.Network.from(8453),
    });
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const idia = new ethers.Contract(IDIA_ADDRESS, ERC20_ABI, provider);

    const tick = async () => {
      try {
        const rawUsdc = await usdc.balanceOf(address).catch(() => 0n);
        await sleep(RPC_DELAY_MS);
        const rawIdia = await idia.balanceOf(address).catch(() => 0n);
        await sleep(RPC_DELAY_MS);
        const rawEth = await provider.getBalance(address).catch(() => 0n);

        if (cancelled) return;

        const current: BalanceSnapshot = {
          eth: Number(ethers.formatEther(rawEth)),
          idia: Number(ethers.formatEther(rawIdia)),
          usdc: Number(ethers.formatUnits(rawUsdc, 6)),
        };

        if (previous) {
          const checks: Array<[ChainAsset, number, number]> = [
            ["ETH", current.eth, previous.eth],
            ["IDIA", current.idia, previous.idia],
            ["USDC", current.usdc, previous.usdc],
          ];
          for (const [asset, now, then] of checks) {
            const delta = now - then;
            // small floor to ignore floating-point noise (~1 gwei worth of ETH, $0.0001)
            if (delta > 0.0000001) {
              onReceiveRef.current({
                asset,
                amount: delta,
                address,
                observed_at: new Date().toISOString(),
              });
            }
          }
        }

        previous = current;
        writeSeen(address, current);
      } catch (e) {
        console.warn("[CHAIN_WATCHER] tick failed:", e);
      }
    };

    // Prime baseline immediately, then poll on interval
    tick();
    const interval = setInterval(tick, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [walletAddress]);
}
