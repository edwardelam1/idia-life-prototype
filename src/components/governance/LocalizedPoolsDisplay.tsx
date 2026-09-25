import React, { useEffect, useState, useRef } from "react";
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { base } from "viem/chains";
import { openExternalLink } from "@/lib/openExternalLink"; // 🚨 NEW IMPORT

// On-chain Source of Truth
const REGISTRY_ADDRESS = "0x137D913d89d0D6a5b2d1Db76173770C94d25387B"; // Base Mainnet registry
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Safe block to start log scans to prevent RPC limits
const REGISTRY_DEPLOY_BLOCK = 18000000n; 

// 🚨 Pre-seeded Known Deployment (Ensures zero UI stalling if event logs fail)
const KNOWN_POOLS: Record<string, `0x${string}`> = {
  "Louisville, KY": "0x8a0D07b6133247B9d35010646A2E684cFd9875ce",
};

const REGISTRY_ABI = [
  parseAbiItem("function getPoolByLocation(string location) view returns (address)"),
  parseAbiItem("event PoolRegistered(string location, address poolAddress)"),
  parseAbiItem("event PoolCreated(string location, address poolAddress)")
];

const USDC_ABI = [
  parseAbiItem("function balanceOf(address account) view returns (uint256)")
];

interface GrantPool {
  location: string;
  address: `0x${string}`;
  balanceUSDC: string;
  rawBalance: number;
}

const LocalizedPoolsDisplay = () => {
  const [pools, setPools] = useState<GrantPool[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchOnChainPools = async () => {
      console.log("[BEGIN: React.GrantPools.Init] Establishing direct RPC connection to Base Mainnet...");
      try {
        const client = createPublicClient({
          chain: base,
          transport: http("https://mainnet.base.org"),
        });

        const poolMap = new Map<string, `0x${string}`>(Object.entries(KNOWN_POOLS));

        try {
          const logs = await client.getLogs({
            address: REGISTRY_ADDRESS,
            event: REGISTRY_ABI[1],
            fromBlock: REGISTRY_DEPLOY_BLOCK,
            toBlock: "latest"
          });

          logs.forEach((log) => {
            const { location, poolAddress } = log.args as any;
            if (location && poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000") {
              poolMap.set(location, poolAddress);
            }
          });
        } catch (logErr) {
          console.warn("🚨 [WARNING: React.GrantPools.DynamicDiscovery] RPC rejected large block range scan. Relying on pre-seeded addresses.", logErr);
        }

        const poolData: GrantPool[] = [];
        
        for (const [location, address] of poolMap.entries()) {
          try {
            const balanceWei = await client.readContract({
              address: USDC_ADDRESS,
              abi: USDC_ABI,
              functionName: "balanceOf",
              args: [address],
            }) as bigint;
            
            const rawBalance = Number(formatUnits(balanceWei, 6));
            
            poolData.push({
              location,
              address,
              rawBalance,
              balanceUSDC: rawBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            });
          } catch (balErr: any) {
            console.error(`🚨 [ERROR: React.GrantPools.BalanceRead] Failed reading balance for ${location}:`, balErr);
          }
        }

        poolData.sort((a, b) => b.rawBalance - a.rawBalance);

        if (isMountedRef.current) {
          setPools(poolData);
          console.log(`[END: React.GrantPools] Successfully hydrated ${poolData.length} active pools to UI.`);
        }
      } catch (error: any) {
        console.error("🚨 [FATAL: React.GrantPools] Top-level failure in on-chain fetch pipeline:", error);
      } finally {
        if (isMountedRef.current) {
            setLoading(false);
        }
      }
    };

    fetchOnChainPools();
  }, []);

  if (loading || pools.length === 0) return null;

  return (
    <div className="w-full animate-in fade-in duration-500 mb-6">
      <div className="flex overflow-x-auto gap-3 pb-2 pt-1 px-1 snap-x hide-scrollbar">
        {pools.map((pool) => {
          const parts = pool.location.split(",");
          const city = parts[0]?.trim() || pool.location;
          const state = parts[1]?.trim() || "";
          
          return (
            <button
              key={pool.address}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 🚨 Trigger native sheet via helper instead of generic window.open
                openExternalLink(`https://basescan.org/address/${pool.address}`);
              }}
              className="flex flex-col justify-center items-start shrink-0 px-5 py-3 rounded-[1.25rem] bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 shadow-sm snap-start hover:scale-[1.02] hover:shadow-md active:scale-95 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {city}{state ? `, ${state}` : ""}
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 tracking-tight">
                ${pool.balanceUSDC} <span className="text-[10px] font-bold text-slate-400 ml-0.5">USDC</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LocalizedPoolsDisplay;