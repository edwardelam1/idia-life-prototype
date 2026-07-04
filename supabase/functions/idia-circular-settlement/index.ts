import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions } from "https://esm.sh/viem@2.9.20";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// ══════════════════════════════════════════════════════════════════════
// 1. PROTOCOL CONSTANTS & SPLIT CONFIG
// ══════════════════════════════════════════════════════════════════════

const REVENUE_SPLIT = { CORPORATE: 0.6, WAR_CHEST: 0.1, DATA_YIELD: 0.3 };
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ALCHEMY_BASE_RPC_URL = Deno.env.get("ALCHEMY_BASE_RPC_URL");
if (!ALCHEMY_BASE_RPC_URL) {
  console.error(`[FATAL STALL: INIT] Missing ALCHEMY_BASE_RPC_URL.`);
  throw new Error("Missing RPC credentials.");
}

const REGISTRY_ADDRESS = "0x137D913d89d0D6a5b2d1Db76173770C94d25387B";
const POOL_FACTORY_ADDRESS = "0x0188FCB027D834E03DD0288D360937ceC4d267bb";
const GLOBAL_WAR_CHEST = "0x0910EF34C9F59A90d90FF505B1036DEed4a25d59";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const IDIA_TOKEN_ADDRESS = "0x6526F939D257E67896821c25B6C24Daa404a01FB";
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
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ══════════════════════════════════════════════════════════════════════
// PLANCK-SCALE ATOMIC EXECUTOR
// ══════════════════════════════════════════════════════════════════════
async function executePlanckScaleTransaction(
  client: any,
  account: any,
  contractAddress: string,
  abi: any,
  funcName: string,
  args: any[],
  stepName: string,
  initialNonce: number,
): Promise<{ txHash: `0x${string}`; nonce: number }> {
  let currentTryNonce = initialNonce;
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.info(`[BEGIN: ${stepName}.Planck.Simulate] Executing dry-run simulation on EVM...`);
      const { request } = await client.simulateContract({
        account,
        address: contractAddress as `0x${string}`,
        abi,
        functionName: funcName,
        args,
      });

      console.info(
        `[BEGIN: ${stepName}.Planck.Prepare] Constructing raw transaction payload (Nonce: ${currentTryNonce})...`,
      );
      const preparedTx = await client.prepareTransactionRequest({
        ...request,
        nonce: currentTryNonce,
      });

      console.info(`[BEGIN: ${stepName}.Planck.Sign] Applying cryptographic signature...`);
      const signedTx = await account.signTransaction(preparedTx);

      console.info(`[BEGIN: ${stepName}.Planck.Broadcast] Injecting raw payload to Base mempool...`);
      const txHash = await client.sendRawTransaction({ serializedTransaction: signedTx });

      console.info(`[END: ${stepName}.Planck.Broadcast] Mempool accepted payload. Hash: ${txHash}`);
      return { txHash, nonce: currentTryNonce };
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || "";
      const isMempoolCollision =
        msg.includes("nonce") ||
        msg.includes("already known") ||
        msg.includes("in-flight") ||
        msg.includes("underpriced") ||
        msg.includes("replacement");

      if (isMempoolCollision && attempt < maxRetries) {
        console.warn(`[RETRY: ${stepName}] Mempool collision detected. Suppressing error.`);
        const jitterMs = Math.floor(Math.random() * 2500) + 1000;
        await new Promise((res) => setTimeout(res, jitterMs));
        currentTryNonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
        continue;
      }

      console.error(`[BEGIN: ${stepName}.Planck.FatalDump]`);
      console.error(`🚨 [FATAL STALL: ${stepName}] Sequencer violently rejected payload injection.`);
      console.error(`[DIAGNOSTIC] Attempted Nonce: ${currentTryNonce} | Target: ${contractAddress}`);
      console.error(`[DIAGNOSTIC] Raw Error: ${error.message}`);
      console.error(`[END: ${stepName}.Planck.FatalDump]`);
      throw error;
    }
  }
  throw new Error("Planck Execution failed to return after retry loop.");
}

async function forceSequencerDelay(ms = 3500): Promise<void> {
  console.info(`[BEGIN: Sequencer.Delay] Pausing ${ms}ms to clear mempool...`);
  await new Promise((resolve) => setTimeout(resolve, ms));
  console.info(`[END: Sequencer.Delay] Resumed.`);
}

// ══════════════════════════════════════════════════════════════════════
// 3. MAIN EXECUTION HANDLER
// ══════════════════════════════════════════════════════════════════════
async function executeSettlement(payoutData: any, runCorrelationId: string): Promise<void> {
  let currentStep = "INIT";
  try {
    console.info(`[BEGIN: circular-settlement] Pulse detected. runId=${runCorrelationId} ts=${Date.now()}`);

    currentStep = "SUPABASE_CLIENT_INIT";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing database connection credentials.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    currentStep = "EXTRACTING_PAYLOAD";
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference, location_string } = payoutData;

    const hasLocation = typeof location_string === "string" && location_string.trim().length > 0;
    const executionLocation = hasLocation ? location_string.trim() : null;
    const ingestionReference = payment_reference || `SYN-${crypto.randomUUID().slice(0, 8)}`;

    currentStep = "CONFIGURING_BLOCKCHAIN";
    const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!rawKey) throw new Error("RELAYER_PRIVATE_KEY missing.");
    const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const activeRpcUrl = ALCHEMY_BASE_RPC_URL;
    const client = createWalletClient({
      account,
      chain: base,
      transport: http(activeRpcUrl),
    }).extend(publicActions);

    const resolvedChainId = await client.getChainId();
    if (resolvedChainId !== 8453) {
      throw new Error(`CRITICAL: Expected Base Mainnet chain ID 8453, got ${resolvedChainId}. Settlement halted.`);
    }

    currentStep = "NONCE_INITIALIZATION";
    let currentNonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
    console.info(`[NONCE_SYNC] Base Mainnet assigned starting nonce: ${currentNonce}`);

    // PHASE 1: CORPORATE SETTLEMENT (60%)
    currentStep = "PHASE_1_CORPORATE_SETTLEMENT";
    const corporateRevenue = total_fiat_amount * REVENUE_SPLIT.CORPORATE;

    const corporateResult = await executePlanckScaleTransaction(
      client,
      account,
      USDC_ADDRESS,
      ERC20_ABI,
      "transfer",
      [SYSTEM_CASH_REGISTER, parseUnits(corporateRevenue.toFixed(6), 6)],
      "Phase_1_Corporate",
      currentNonce,
    );
    currentNonce = corporateResult.nonce + 1;
    const corporateHash = corporateResult.txHash;

    const corporateReceipt = await client.waitForTransactionReceipt({ hash: corporateHash, confirmations: 1 });
    if (corporateReceipt.status === "success") {
      await forceSequencerDelay();
    }

    // PHASE 2: REGIONAL ROUTING (10%)
    currentStep = "PHASE_2_REGIONAL_ROUTING";
    const regionalRevenue = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;

    let finalRegionalAddress: string = GLOBAL_WAR_CHEST;
    let routingMode: string = "war_chest_null";

    if (hasLocation) {
      let poolTarget: string | undefined;
      try {
        poolTarget = await client.readContract({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: "getPoolByLocation",
          args: [executionLocation as string],
        });
      } catch (routingError: any) {
        console.error(`[WARNING: Registry lookup failed]: ${routingError.message}`);
      }

      if (poolTarget && poolTarget !== ZERO_ADDRESS) {
        finalRegionalAddress = poolTarget;
        routingMode = "existing_pool";
      } else {
        try {
          const deployResult = await executePlanckScaleTransaction(
            client,
            account,
            POOL_FACTORY_ADDRESS,
            POOL_FACTORY_ABI,
            "deployPool",
            [executionLocation as string],
            "Phase_2_Regional.DeployPool",
            currentNonce,
          );
          currentNonce = deployResult.nonce + 1;

          await client.waitForTransactionReceipt({ hash: deployResult.txHash, confirmations: 1 });

          const minted = await client.readContract({
            address: POOL_FACTORY_ADDRESS,
            abi: POOL_FACTORY_ABI,
            functionName: "getPool",
            args: [executionLocation as string],
          });
          if (!minted || minted === ZERO_ADDRESS) throw new Error(`getPool zero post-deploy`);

          finalRegionalAddress = minted as string;
          routingMode = "deployed_pool";
        } catch (deployError: any) {
          console.error(`[WARNING: DeployPool failed] — falling back to WAR_CHEST`);
          finalRegionalAddress = GLOBAL_WAR_CHEST;
          routingMode = "war_chest_fallback";
        }
      }
    }

    const regionalResult = await executePlanckScaleTransaction(
      client,
      account,
      USDC_ADDRESS,
      ERC20_ABI,
      "transfer",
      [finalRegionalAddress as `0x${string}`, parseUnits(regionalRevenue.toFixed(6), 6)],
      "Phase_2_Regional",
      currentNonce,
    );
    currentNonce = regionalResult.nonce + 1;
    const regionalHash = regionalResult.txHash;

    const regionalReceipt = await client.waitForTransactionReceipt({ hash: regionalHash, confirmations: 1 });
    if (regionalReceipt.status === "success") {
      await forceSequencerDelay();
    }

    // LEDGER HYDRATION - Corporate & Regional
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

    // PHASE 3 & 5: ON-CHAIN ROYALTY (USDC) & AUTONOMOUS IDIA TOKEN AWARD
    currentStep = "PHASE_3_AND_5_CONTRIBUTOR_DISTRIBUTION";

    // Dynamic Decimal Extraction for IDIA to ensure 100% mathematical certainty on 1:1 match
    let idiaDecimals = 18;
    try {
      const fetchedDecimals = await client.readContract({
        address: IDIA_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      });
      idiaDecimals = Number(fetchedDecimals);
      console.info(`[DIAGNOSTIC] IDIA Token Contract confirmed decimals: ${idiaDecimals}`);
    } catch (e) {
      console.warn(`[WARNING] Could not fetch IDIA decimals from contract, defaulting to 18.`);
    }

    const totalRoyaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const perContributorYield = totalRoyaltyPool / contributing_users.length;

    // 1:1 Matching Logic
    const exactYieldAmountString = perContributorYield.toFixed(6);
    const usdcTransferAmount = parseUnits(exactYieldAmountString, 6);
    const idiaAwardAmount = parseUnits(exactYieldAmountString, idiaDecimals);

    console.info(`[BEGIN: Phase_3_Contributor.BatchExecution] Initializing sequential transaction pipeline.`);
    console.info(`[DIAGNOSTIC] Split configured for 1:1 match. Face Value: ${exactYieldAmountString}`);

    try {
      for (let i = 0; i < contributing_users.length; i++) {
        const contributor = contributing_users[i];
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", contributor.user_id)
          .single();

        const lifeWallet = profile?.wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";

        let yieldHash: string | null = null;
        let idiaHash: string | null = null;

        // --- STEP 1: USDC YIELD ---
        try {
          const yieldResult = await executePlanckScaleTransaction(
            client,
            account,
            USDC_ADDRESS,
            ERC20_ABI,
            "transfer",
            [lifeWallet as `0x${string}`, usdcTransferAmount],
            `Phase_3_Contributor.Yield_USDC_${i}`,
            currentNonce,
          );
          currentNonce = yieldResult.nonce + 1;
          yieldHash = yieldResult.txHash;

          await client.waitForTransactionReceipt({ hash: yieldHash as `0x${string}`, confirmations: 1 });

          // Write USDC success to ledger immediately
          const { error: usdcDbError } = await supabase.from("synapse_credit_ledger").insert({
            user_id: contributor.user_id,
            amount: perContributorYield,
            entry_type: "deposit",
            transaction_type: "data_sale_payout",
            status: "completed",
            blockchain_tx_hash: yieldHash,
            is_settled: true,
            settled_at: new Date().toISOString(),
            description: `Pro-rata USDC yield for Ref: ${ingestionReference}`,
          });

          if (usdcDbError) {
            console.error(`[FATAL STALL: DB] Supabase violently rejected USDC ledger insert: ${usdcDbError.message}`);
          } else {
            console.info(`[SUCCESS] USDC Database Ledger updated for ${lifeWallet}`);
          }
        } catch (usdcError: any) {
          console.error(
            `[FATAL STALL: Batch.Item.USDC] Failed executing USDC transfer for ${lifeWallet}: ${usdcError.message}`,
          );
        }

        // --- STEP 2: IDIA MATCH ---
        try {
          const idiaResult = await executePlanckScaleTransaction(
            client,
            account,
            IDIA_TOKEN_ADDRESS,
            ERC20_ABI,
            "transfer",
            [lifeWallet as `0x${string}`, idiaAwardAmount],
            `Phase_5_Contributor.Yield_IDIA_${i}`,
            currentNonce,
          );
          currentNonce = idiaResult.nonce + 1;
          idiaHash = idiaResult.txHash;

          await client.waitForTransactionReceipt({ hash: idiaHash as `0x${string}`, confirmations: 1 });

          // Write IDIA success to ledger
          const { error: idiaDbError } = await supabase.from("synapse_credit_ledger").insert({
            user_id: contributor.user_id,
            amount: perContributorYield,
            entry_type: "deposit",
            transaction_type: "idia_token_award",
            status: "completed",
            blockchain_tx_hash: idiaHash,
            is_settled: true,
            settled_at: new Date().toISOString(),
            description: `1:1 IDIA Token Match for Ref: ${ingestionReference}`,
          });

          if (idiaDbError) {
            console.error(`[FATAL STALL: DB] Supabase violently rejected IDIA ledger insert: ${idiaDbError.message}`);
          } else {
            console.info(`[SUCCESS] IDIA Database Ledger updated for ${lifeWallet}`);
          }
        } catch (idiaError: any) {
          console.error(
            `[FATAL STALL: Batch.Item.IDIA] Failed executing IDIA transfer for ${lifeWallet}: ${idiaError.message}`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (globalError: any) {
      console.error(`[FATAL STALL: Phase_3_Contributor.Global] ${globalError.message}`);
    }

    console.info(`[COMPLETE: circular-settlement] runId=${runCorrelationId}`);
  } catch (error: any) {
    console.error(`🚨 [FATAL STALL: ${currentStep}] runId=${runCorrelationId} :: ${error?.message ?? String(error)}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let payoutData: any;
  try {
    const rawBody = await req.json();
    payoutData =
      rawBody && typeof rawBody === "object" && rawBody.record && rawBody.record.payload
        ? rawBody.record.payload
        : rawBody;
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { total_fiat_amount, contributing_users } = payoutData ?? {};
  if (!total_fiat_amount || total_fiat_amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid total_fiat_amount." }), { status: 400, headers: corsHeaders });
  }
  if (!contributing_users || !Array.isArray(contributing_users) || contributing_users.length === 0) {
    return new Response(JSON.stringify({ error: "Missing contributing_users." }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const runCorrelationId = crypto.randomUUID();
  console.info(`[ACCEPTED] circular-settlement queued. runId=${runCorrelationId} ts=${Date.now()}`);

  EdgeRuntime.waitUntil(executeSettlement(payoutData, runCorrelationId));

  return new Response(
    JSON.stringify({
      accepted: true,
      runId: runCorrelationId,
      message: "Settlement queued for asynchronous execution.",
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
