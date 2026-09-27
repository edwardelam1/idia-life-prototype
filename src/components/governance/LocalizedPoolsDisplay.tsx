import { openBasescan } from "./BasescanSheet";
import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { MapPin, ExternalLink } from "lucide-react";
import { PROTOCOL, REGISTRY_ABI } from "@/config/contracts";

// On-chain Source of Truth (Base Mainnet)
const REGISTRY_ADDRESS = PROTOCOL.registry;
const USDC_ADDRESS = PROTOCOL.usdc;
const BASE_NETWORK = { name: "base", chainId: 8453 };

// Pre-seeded known deployment — guarantees zero UI stalling if registry reads fail.
const KNOWN_POOLS: Record<string, string> = {
  "Louisville, KY": "0x8a0D07b6133247B9d35010646A2E684cFd9875ce",
};

const USDC_ABI = ["function balanceOf(address account) view returns (uint256)"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const resolveRpcUrl = (): string => {
  const raw = (import.meta as any).env?.VITE_ALCHEMY_RPC_URL;
  if (typeof raw === "string" && raw.startsWith("https://")) return raw;
  console.warn("[RPC_RESOLVER][FALLBACK] VITE_ALCHEMY_RPC_URL missing — deflecting to public Base node.");
  return "https://mainnet.base.org";
};

interface GrantPool {
  location: string;
  address: string;
  balanceUSDC: string;
  rawBalance: number;
}

const LocalizedPoolsDisplay: React.FC = () => {
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
        const provider = new ethers.JsonRpcProvider(resolveRpcUrl(), BASE_NETWORK, {
          staticNetwork: ethers.Network.from(BASE_NETWORK),
        });
        console.log("[END: React.GrantPools.Init] RPC provider instantiated.");

        console.log("[BEGIN: React.GrantPools.MapSeed] Seeding known deployment addresses.");
        const poolMap = new Map<string, string>(Object.entries(KNOWN_POOLS));
        console.log(`[END: React.GrantPools.MapSeed] Seeded ${poolMap.size} known pools.`);

        console.log("[BEGIN: React.GrantPools.DynamicDiscovery] Reading registry location index...");
        try {
          const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
          const locations: string[] = await registry.getAllLocations();
          console.log(
            `[PROCESS: React.GrantPools.DynamicDiscovery] Registry reports ${locations.length} registered locations.`,
          );

          for (const location of locations) {
            console.log(`[BEGIN: React.GrantPools.RegistryRead] Resolving pool for "${location}".`);
            try {
              const poolAddress: string = await registry.getPoolByLocation(location);
              if (poolAddress && poolAddress !== ZERO_ADDRESS) {
                poolMap.set(location, poolAddress);
                console.log(`[END: React.GrantPools.RegistryRead] ${location} -> ${poolAddress}`);
              } else {
                console.log(`[END: React.GrantPools.RegistryRead] ${location} has no active pool — skipped.`);
              }
            } catch (readErr) {
              console.warn(`🚨 [WARNING: React.GrantPools.RegistryRead] Failed resolving "${location}".`, readErr);
            }
          }
          console.log("[END: React.GrantPools.DynamicDiscovery] Registry scan complete.");
        } catch (regErr) {
          console.warn(
            "🚨 [WARNING: React.GrantPools.DynamicDiscovery] Registry read failed. Relying on pre-seeded addresses.",
            regErr,
          );
          console.log("[END: React.GrantPools.DynamicDiscovery] Handled limitation fallback.");
        }

        console.log(
          `[BEGIN: React.GrantPools.BalanceResolution] Querying USDC balances for ${poolMap.size} locations.`,
        );
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
        const poolData: GrantPool[] = [];

        for (const [location, address] of poolMap.entries()) {
          console.log(`[BEGIN: React.GrantPools.BalanceRead] Reading USDC for ${location} at ${address}`);
          try {
            const balanceRaw: bigint = await usdc.balanceOf(address);
            const rawBalance = Number(ethers.formatUnits(balanceRaw, 6)); // USDC 6 decimals

            poolData.push({
              location,
              address,
              rawBalance,
              balanceUSDC: rawBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            });
            console.log(`[END: React.GrantPools.BalanceRead] Read successful: ${rawBalance} USDC`);
          } catch (balErr) {
            console.error(`🚨 [ERROR: React.GrantPools.BalanceRead] Failed reading balance for ${location}:`, balErr);
          }
        }
        console.log("[END: React.GrantPools.BalanceResolution] All balances resolved.");

        console.log("[BEGIN: React.GrantPools.Sorting] Ordering pools by TVL descending.");
        poolData.sort((a, b) => b.rawBalance - a.rawBalance);
        console.log("[END: React.GrantPools.Sorting] Sort complete.");

        if (isMountedRef.current) {
          setPools(poolData);
          console.log(`[END: React.GrantPools] Successfully hydrated ${poolData.length} active pools to UI.`);
        }
      } catch (error) {
        console.error("🚨 [FATAL: React.GrantPools] Top-level failure in on-chain fetch pipeline:", error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          console.log("[END: React.GrantPools.Lifecycle] Loading state released.");
        }
      }
    };

    fetchOnChainPools();
  }, []);

  if (loading || pools.length === 0) return null;

  return (
    <section className="space-y-3 animate-in fade-in duration-500">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
        <MapPin size={14} className="text-teal-600" /> Decentralized Community Grant Pools
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
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
                openBasescan(pool.address, "address");
              }}
              className="flex flex-col justify-center items-start shrink-0 px-5 py-3 rounded-[1.25rem] bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 shadow-sm snap-start hover:scale-[1.02] hover:shadow-md active:scale-95 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                {city}
                {state ? `, ${state}` : ""}
                <ExternalLink size={10} className="text-slate-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                ${pool.balanceUSDC} USDC
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default LocalizedPoolsDisplay;
