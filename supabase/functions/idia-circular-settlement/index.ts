import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions } from "https://esm.sh/viem@2.9.20";

// ══════════════════════════════════════════════════════════════════════
// 1. PROTOCOL CONSTANTS & SPLIT CONFIG
// ══════════════════════════════════════════════════════════════════════

const REVENUE_SPLIT = { CORPORATE: 0.6, WAR_CHEST: 0.1, DATA_YIELD: 0.3 };
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Network — hardcoded Alchemy fallback ensures regional routing never collapses to public Base RPC.
const PROD_ALCHEMY_URL = "https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N";
const ALCHEMY_BASE_RPC_URL = Deno.env.get("ALCHEMY_BASE_RPC_URL");

// Protocol contracts — Base Mainnet (mirrors src/config/contracts.ts)
const REGISTRY_ADDRESS = "0x137D913d89d0D6a5b2d1Db76173770C94d25387B";
const POOL_FACTORY_ADDRESS = "0x0188FCB027D834E03DD0288D360937ceC4d267bb";
const ESCROW_ECOSYSTEM = "0xDc93eca954fD2625001b2fb9E9A098914365ADe9";
// Wallet-as-Source-of-Truth: when location is null/blank, route to the DAO Safe
// (Global War Chest). Funds remain in cryptographically-verifiable governance custody
// even if the database goes dark.
const GLOBAL_WAR_CHEST = "0x0910EF34C9F59A90d90FF505B1036DEed4a25d59";

// USDC on Base Mainnet
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// System wallets
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";

// ══════════════════════════════════════════════════════════════════════
// 2. ABIs
// ══════════════════════════════════════════════════════════════════════

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const REGISTRY_ABI = [
  {
    name: "getPoolByLocation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "location", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const POOL_FACTORY_ABI = [
  {
    name: "getPool",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "location", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "deployPool",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "location", type: "string" }],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

const ESCROW_ABI = [
  {
    name: "proposeDistribution",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ══════════════════════════════════════════════════════════════════════
// 3. MAIN EXECUTION HANDLER
// ══════════════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  let currentStep = "INIT";
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.info(`[BEGIN: circular-settlement] Pulse detected.`);

    currentStep = "SUPABASE_CLIENT_INIT";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("IDIA_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) throw new Error("Missing SUPABASE_URL or IDIA_SECRET_KEY.");
    const supabase = createClient(supabaseUrl, supabaseKey);

    currentStep = "VALIDATING_INPUTS";
    const payoutData = await req.json();
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference, location_string } = payoutData;

    if (!total_fiat_amount || total_fiat_amount <= 0) throw new Error("Invalid total_fiat_amount.");
    if (!contributing_users || !Array.isArray(contributing_users) || contributing_users.length === 0) {
      throw new Error("Missing contributing_users.");
    }

    // Null vs orphaned location distinction:
    //   - missing/blank  → no location intent → route to GLOBAL_WAR_CHEST
    //   - present string → real location → resolve via Registry; if zero, deploy a new pool
    const hasLocation = typeof location_string === "string" && location_string.trim().length > 0;
    const executionLocation = hasLocation ? location_string.trim() : null;
    const ingestionReference = payment_reference || `SYN-${crypto.randomUUID().slice(0, 8)}`;

    currentStep = "CONFIGURING_BLOCKCHAIN";
    const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!rawKey) throw new Error("RELAYER_PRIVATE_KEY missing.");
    const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const activeRpcUrl = BASE_RPC_URL || PROD_ALCHEMY_URL;
    console.log(`[REGIONAL_ROUTING][TRANSPORT_BINDING] Launching wallet client. Route Vector: ${activeRpcUrl}`);

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(activeRpcUrl),
    }).extend(publicActions);

    // Hard-mainnet enforcement: confirm RPC actually returns Base Mainnet chain ID (8453).
    const resolvedChainId = await client.getChainId();
    console.info(`[DIAGNOSTIC: Network] Resolved chain ID: ${resolvedChainId}`);
    if (resolvedChainId !== 8453) {
      throw new Error(
        `CRITICAL: Active RPC route (${activeRpcUrl}) is not Base Mainnet. Expected chain ID 8453, got ${resolvedChainId}. Settlement halted.`,
      );
    }

    // PHASE 1: CORPORATE SETTLEMENT (60%)
    currentStep = "PHASE_1_CORPORATE_SETTLEMENT";
    const corporateRevenue = total_fiat_amount * REVENUE_SPLIT.CORPORATE;

    console.info(`[BEGIN: Phase_1_Corporate.Transfer] amount=${corporateRevenue}`);
    const corporateHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [SYSTEM_CASH_REGISTER, parseUnits(corporateRevenue.toFixed(6), 6)],
      account,
    });
    console.info(`[STATUS: Phase_1_Corporate.Transfer] TX Broadcasted. Hash: ${corporateHash}. Awaiting network confirmation...`);
    const corporateReceipt = await client.waitForTransactionReceipt({ hash: corporateHash, confirmations: 1 });
    if (corporateReceipt.status === "success") {
      console.info(`[END: Phase_1_Corporate.Transfer] Transfer successful. Block: ${corporateReceipt.blockNumber}`);
    } else {
      console.error(`[ERROR: Phase_1_Corporate.Transfer] Transaction reverted on-chain. Hash: ${corporateHash}`);
    }

    // PHASE 2: REGIONAL ROUTING (10%) — Wallet-as-Source-of-Truth
    currentStep = "PHASE_2_REGIONAL_ROUTING";
    const regionalRevenue = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;

    let finalRegionalAddress: string = GLOBAL_WAR_CHEST;
    let routingMode: "war_chest_null" | "existing_pool" | "deployed_pool" | "war_chest_fallback" = "war_chest_null";

    if (!hasLocation) {
      console.info(`[ROUTING] location_string is null/blank → GLOBAL_WAR_CHEST ${GLOBAL_WAR_CHEST}`);
      routingMode = "war_chest_null";
    } else {
      console.info(`[BEGIN: Registry.getPoolByLocation] location=${executionLocation}`);
      let poolTarget: string | undefined;
      try {
        poolTarget = await client.readContract({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: "getPoolByLocation",
          args: [executionLocation as string],
        });
        console.info(`[END: Registry.getPoolByLocation] resolved=${poolTarget}`);
      } catch (routingError: any) {
        console.error(
          `[WARNING: Registry.getPoolByLocation] lookup failed for ${executionLocation}: ${routingError.message}`,
        );
      }

      if (poolTarget && poolTarget !== ZERO_ADDRESS) {
        finalRegionalAddress = poolTarget;
        routingMode = "existing_pool";
        console.info(`[ROUTING] existing pool for ${executionLocation} → ${finalRegionalAddress}`);
      } else {
        // Orphaned but valid location → mint a new pool via PoolFactory
        console.info(`[BEGIN: PoolFactory.deployPool] location=${executionLocation} — orphan detected, minting pool`);
        try {
          const deployHash = await client.writeContract({
            address: POOL_FACTORY_ADDRESS,
            abi: POOL_FACTORY_ABI,
            functionName: "deployPool",
            args: [executionLocation as string],
            account,
          });
          console.info(`[STATUS: PoolFactory.deployPool] TX Broadcasted. Hash: ${deployHash}.`);
          const deployReceipt = await client.waitForTransactionReceipt({ hash: deployHash, confirmations: 1 });
          if (deployReceipt.status !== "success") {
            throw new Error(`deployPool reverted (${deployHash})`);
          }
          // Re-resolve from factory to capture the freshly minted address
          const minted = await client.readContract({
            address: POOL_FACTORY_ADDRESS,
            abi: POOL_FACTORY_ABI,
            functionName: "getPool",
            args: [executionLocation as string],
          });
          if (!minted || minted === ZERO_ADDRESS) {
            throw new Error(`getPool returned zero post-deploy for ${executionLocation}`);
          }
          finalRegionalAddress = minted as string;
          routingMode = "deployed_pool";
          console.info(`[END: PoolFactory.deployPool] minted ${finalRegionalAddress} for ${executionLocation}`);
        } catch (deployError: any) {
          console.error(
            `[WARNING: PoolFactory.deployPool] failed for ${executionLocation}: ${deployError.message} — falling back to GLOBAL_WAR_CHEST`,
          );
          finalRegionalAddress = GLOBAL_WAR_CHEST;
          routingMode = "war_chest_fallback";
        }
      }
    }

    console.info(`[BEGIN: Phase_2_Regional.Transfer] amount=${regionalRevenue} target=${finalRegionalAddress} mode=${routingMode}`);
    const regionalHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [finalRegionalAddress as `0x${string}`, parseUnits(regionalRevenue.toFixed(6), 6)],
      account,
    });
    console.info(`[STATUS: Phase_2_Regional.Transfer] TX Broadcasted. Hash: ${regionalHash}. Awaiting network confirmation...`);
    const regionalReceipt = await client.waitForTransactionReceipt({ hash: regionalHash, confirmations: 1 });
    if (regionalReceipt.status === "success") {
      console.info(`[END: Phase_2_Regional.Transfer] Transfer successful. Block: ${regionalReceipt.blockNumber}`);
    } else {
      console.error(`[ERROR: Phase_2_Regional.Transfer] Transaction reverted on-chain. Hash: ${regionalHash}`);
    }

    // LEDGER HYDRATION
    await Promise.all([
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: corporateRevenue,
        entry_type: "revenue",
        transaction_type: "HUB_PROTOCOL_FEE",
        status: "completed",
        blockchain_tx_hash: corporateHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `60% Corporate Revenue: ${ingestionReference}`,
      }),
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: regionalRevenue,
        entry_type: "escrow",
        transaction_type: "ECOSYSTEM_WAR_CHEST",
        status: "completed",
        blockchain_tx_hash: regionalHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `10% Regional/War Chest [${routingMode} → ${finalRegionalAddress}]: ${ingestionReference}`,
      }),
    ]);

    // PHASE 3 & 5: ON-CHAIN ROYALTY & AUTONOMOUS IDIA PROPOSAL
    currentStep = "PHASE_3_AND_5_CONTRIBUTOR_DISTRIBUTION";
    const totalRoyaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const perContributorYield = totalRoyaltyPool / contributing_users.length;
    const contributorPayouts = [];
    const idiaAwardAmount = parseUnits("1", 18);

    console.info("[BEGIN: Phase_3_Contributor.BatchExecution] Initializing sequential transaction pipeline.");
    try {
      for (let i = 0; i < contributing_users.length; i++) {
        const contributor = contributing_users[i];
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", contributor.user_id)
          .single();

        const lifeWallet = profile?.wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";
        console.info(`[BEGIN: Batch.Item] Processing transfer ${i + 1}/${contributing_users.length} to ${lifeWallet}`);

        try {
          // 1. Yield transfer (USDC)
          const yieldHash = await client.writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [lifeWallet as `0x${string}`, parseUnits(perContributorYield.toFixed(6), 6)],
            account,
          });
          console.info(`[STATUS: Batch.Item] Yield TX Broadcasted. Hash: ${yieldHash}. Awaiting network confirmation...`);
          const yieldReceipt = await client.waitForTransactionReceipt({ hash: yieldHash, confirmations: 1 });
          if (yieldReceipt.status === "success") {
            console.info(`[END: Batch.Item] Yield transfer successful. Block: ${yieldReceipt.blockNumber}`);
          } else {
            console.error(`[ERROR: Batch.Item] Yield transaction reverted on-chain. Hash: ${yieldHash}`);
          }

          // 2. Royalty proposal (escrow)
          const proposalHash = await client.writeContract({
            address: ESCROW_ECOSYSTEM,
            abi: ESCROW_ABI,
            functionName: "proposeDistribution",
            args: [
              lifeWallet as `0x${string}`,
              idiaAwardAmount,
              `Automated royalty yield proposal: Ref ${ingestionReference}`,
            ],
            account,
          });
          console.info(`[STATUS: Batch.Item] Proposal TX Broadcasted. Hash: ${proposalHash}. Awaiting network confirmation...`);
          const proposalReceipt = await client.waitForTransactionReceipt({ hash: proposalHash, confirmations: 1 });
          if (proposalReceipt.status === "success") {
            console.info(`[END: Batch.Item] Proposal successful. Block: ${proposalReceipt.blockNumber}`);
          } else {
            console.error(`[ERROR: Batch.Item] Proposal reverted on-chain. Hash: ${proposalHash}`);
          }

          // 3. Ledger insert
          const yieldStatus = yieldReceipt.status === "success" ? "completed" : "failed";
          await supabase.from("synapse_credit_ledger").insert({
            user_id: contributor.user_id,
            amount: perContributorYield,
            entry_type: "deposit",
            transaction_type: "DATA_SALE_PAYOUT",
            status: yieldStatus,
            blockchain_tx_hash: yieldHash,
            is_settled: true,
            settled_at: new Date().toISOString(),
            description: `Pro-rata yield for Ref: ${ingestionReference}`,
          });

          contributorPayouts.push({
            wallet: lifeWallet,
            yield_hash: yieldHash,
            proposal_hash: proposalHash,
          });

          // 4. RPC rate-limit buffer
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (txError: any) {
          console.info(`[BEGIN: Batch.Item.Error]`);
          console.error(`[FATAL STALL: Batch.Item] Failed executing transfer for ${lifeWallet}: ${txError.message}`);
          console.info(`[END: Batch.Item.Error]`);
          continue;
        }
      }
      console.info("[END: Phase_3_Contributor.BatchExecution] Pipeline cleared.");
    } catch (globalError: any) {
      console.error(`[FATAL STALL: Phase_3_Contributor.Global] ${globalError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        corporateHash,
        regionalHash,
        regionalTarget: finalRegionalAddress,
        routingMode,
        payouts: contributorPayouts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error(`🚨 [FATAL STALL: ${currentStep}]: ${error.message}`);
    const isClientFault = currentStep === "VALIDATING_INPUTS";
    return new Response(JSON.stringify({ error: error.message, failed_at: currentStep }), {
      status: isClientFault ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
