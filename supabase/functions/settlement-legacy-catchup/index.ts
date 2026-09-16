// ══════════════════════════════════════════════════════════════════════
// SETTLEMENT LEGACY CATCH-UP
//
// One-time audit + recovery for the corporate (60%) and war-chest (10%)
// revenue legs. Between 2026-07 and 2026-09 those legs were broadcast as
// BARE, EMPTY transactions (to=null, no calldata, zero logs): the receipts
// reported success, the ledger recorded "completed", but no USDC ever left
// the relayer.
//
// Modes:
//   { "mode": "audit" }                      → read-only report, no transfers
//   { "mode": "execute", "confirm": "CATCH_UP" } → sends catch-up transfers
//
// Execution rules:
//   - Every recorded tx is fetched from chain and classified as a real
//     ERC-20 transfer or an empty no-op. Only no-ops count as shortfall.
//   - Catch-up transfers are capped by the relayer's actual USDC balance.
//     If the shortfall exceeds the balance, the remaining gap is REPORTED,
//     never silently ignored.
//   - Every catch-up transfer is proof-of-payment verified (real Transfer
//     event, correct recipient, correct amount) before a ledger row is
//     written.
// ══════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import {
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  publicActions,
  toHex,
} from "https://esm.sh/viem@2.9.20";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const GLOBAL_WAR_CHEST = "0x0910EF34C9F59A90d90FF505B1036DEed4a25d59";
const TRANSFER_TOPIC = keccak256(toHex("Transfer(address,address,uint256)"));
const TRANSFER_SELECTOR = "0xa9059cbb";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const toMicro = (usd: number) => Math.round(Number(usd) * 1_000_000);

// War-chest rows encode their destination as "… [mode → 0xabc…]: REF".
function destinationFor(row: any): string {
  if (row.transaction_type === "hub_protocol_fee") return SYSTEM_CASH_REGISTER;
  const match = String(row.description ?? "").match(/0x[a-fA-F0-9]{40}/);
  return match ? match[0] : GLOBAL_WAR_CHEST;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const started = Date.now();
  console.info(`[BEGIN: legacy-catchup] invoked ts=${started}`);

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const mode = body.mode === "execute" ? "execute" : "audit";
    const confirmed = body.confirm === "CATCH_UP";
    console.info(`[STATUS: legacy-catchup] mode=${mode} confirmed=${confirmed}`);

    console.info(`[BEGIN: legacy-catchup.SupabaseInit]`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing database credentials.");
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.info(`[END: legacy-catchup.SupabaseInit]`);

    console.info(`[BEGIN: legacy-catchup.LoadLedger] Reading corporate + war-chest rows...`);
    const { data: rows, error: rowsError } = await supabase
      .from("synapse_credit_ledger")
      .select("id, transaction_type, amount, blockchain_tx_hash, description, reference_id, created_at")
      .in("transaction_type", ["hub_protocol_fee", "ecosystem_war_chest"])
      .order("created_at", { ascending: true });
    if (rowsError) throw new Error(`Ledger read failed: ${rowsError.message}`);
    console.info(`[END: legacy-catchup.LoadLedger] rows=${rows?.length ?? 0}`);

    console.info(`[BEGIN: legacy-catchup.ChainInit]`);
    const rpcUrl = Deno.env.get("ALCHEMY_BASE_RPC_URL");
    if (!rpcUrl) throw new Error("Missing ALCHEMY_BASE_RPC_URL.");
    const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!rawKey) throw new Error("Missing RELAYER_PRIVATE_KEY.");
    const account = privateKeyToAccount(
      (rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`) as `0x${string}`,
    );
    const client = createWalletClient({ account, chain: base, transport: http(rpcUrl) }).extend(publicActions);
    const chainId = await client.getChainId();
    if (chainId !== 8453) throw new Error(`RPC is not Base Mainnet (chainId=${chainId}).`);
    console.info(`[END: legacy-catchup.ChainInit] relayer=${account.address} chainId=${chainId}`);

    // ── Classify every recorded transaction ────────────────────────────
    console.info(`[BEGIN: legacy-catchup.Classify] Inspecting ${rows?.length ?? 0} recorded transactions...`);
    const txCache = new Map<string, { real: boolean; to: string | null; amountMicro: number }>();
    const shortfallMicro = new Map<string, number>();
    const details: any[] = [];
    let realCount = 0;
    let noopCount = 0;
    let missingHash = 0;

    for (const row of rows ?? []) {
      const dest = destinationFor(row).toLowerCase();
      const owedMicro = toMicro(row.amount ?? 0);
      const hash = row.blockchain_tx_hash as string | null;

      if (!hash) {
        missingHash++;
        shortfallMicro.set(dest, (shortfallMicro.get(dest) ?? 0) + owedMicro);
        details.push({ id: row.id, type: row.transaction_type, dest, owedMicro, status: "NO_TX_HASH" });
        continue;
      }

      let info = txCache.get(hash);
      if (!info) {
        const tx: any = await client.getTransaction({ hash: hash as `0x${string}` }).catch(() => null);
        if (!tx) {
          info = { real: false, to: null, amountMicro: 0 };
        } else {
          const isTransfer =
            !!tx.to &&
            String(tx.to).toLowerCase() === USDC_ADDRESS.toLowerCase() &&
            String(tx.input ?? "").startsWith(TRANSFER_SELECTOR);
          info = isTransfer
            ? {
                real: true,
                to: "0x" + String(tx.input).slice(34, 74),
                amountMicro: Number(BigInt("0x" + String(tx.input).slice(74))),
              }
            : { real: false, to: tx.to ?? null, amountMicro: 0 };
        }
        txCache.set(hash, info);
      }

      if (info.real) {
        realCount++;
        details.push({ id: row.id, type: row.transaction_type, dest, owedMicro, status: "REAL_TRANSFER", hash });
      } else {
        noopCount++;
        shortfallMicro.set(dest, (shortfallMicro.get(dest) ?? 0) + owedMicro);
        details.push({ id: row.id, type: row.transaction_type, dest, owedMicro, status: "EMPTY_NOOP", hash });
      }
    }
    console.info(
      `[END: legacy-catchup.Classify] real=${realCount} noop=${noopCount} missingHash=${missingHash} destinations=${shortfallMicro.size}`,
    );

    const balanceRaw: bigint = (await client.readContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;
    const relayerMicro = Number(balanceRaw);
    const totalShortfall = [...shortfallMicro.values()].reduce((a, b) => a + b, 0);
    console.info(
      `[STATUS: legacy-catchup] relayerBalanceMicro=${relayerMicro} totalShortfallMicro=${totalShortfall} gapMicro=${Math.max(0, totalShortfall - relayerMicro)}`,
    );

    const report = {
      mode,
      relayer: account.address,
      relayer_usdc: relayerMicro / 1e6,
      rows_examined: rows?.length ?? 0,
      real_transfers: realCount,
      empty_noops: noopCount,
      rows_without_hash: missingHash,
      shortfall_by_destination: Object.fromEntries(
        [...shortfallMicro.entries()].map(([addr, micro]) => [addr, micro / 1e6]),
      ),
      total_shortfall_usdc: totalShortfall / 1e6,
      unfunded_gap_usdc: Math.max(0, totalShortfall - relayerMicro) / 1e6,
      transfers: [] as any[],
    };

    if (mode !== "execute" || !confirmed) {
      console.info(`[END: legacy-catchup] audit-only. ms=${Date.now() - started}`);
      return new Response(JSON.stringify({ ...report, details }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Catch-up execution, capped by actual balance ───────────────────
    console.info(`[BEGIN: legacy-catchup.Execute] Paying out capped by relayer balance...`);
    let remaining = relayerMicro;
    // Largest destination first so the biggest obligation is satisfied first.
    const ordered = [...shortfallMicro.entries()].sort((a, b) => b[1] - a[1]);

    for (const [dest, owedMicro] of ordered) {
      const payMicro = Math.min(owedMicro, remaining);
      console.info(`[BEGIN: legacy-catchup.Pay:${dest}] owed=${owedMicro} paying=${payMicro} remaining=${remaining}`);
      if (payMicro <= 0) {
        console.warn(`[END: legacy-catchup.Pay:${dest}] SKIPPED — relayer exhausted. Gap ${owedMicro} micro USDC.`);
        report.transfers.push({ destination: dest, paid_usdc: 0, owed_usdc: owedMicro / 1e6, status: "unfunded" });
        continue;
      }

      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [dest as `0x${string}`, BigInt(payMicro)],
      });
      if (!data || data === "0x") throw new Error(`ENCODE_GUARD: empty calldata for ${dest}.`);

      const nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
      const prepared = await client.prepareTransactionRequest({
        account,
        chain: base,
        to: USDC_ADDRESS as `0x${string}`,
        data,
        value: 0n,
        nonce,
      });
      if (!prepared.to || !prepared.data || prepared.data === "0x") {
        throw new Error(`PAYLOAD_GUARD: empty transaction for ${dest}.`);
      }
      const signed = await account.signTransaction(prepared);
      const hash = await client.sendRawTransaction({ serializedTransaction: signed });
      console.info(`[STATUS: legacy-catchup.Pay:${dest}] broadcast hash=${hash} nonce=${nonce}`);
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error(`Catch-up transfer reverted (${hash}).`);

      const landed = (receipt.logs ?? []).some(
        (log: any) =>
          String(log.address).toLowerCase() === USDC_ADDRESS.toLowerCase() &&
          String(log.topics?.[0] ?? "").toLowerCase() === TRANSFER_TOPIC.toLowerCase() &&
          ("0x" + String(log.topics?.[2] ?? "").slice(-40)).toLowerCase() === dest.toLowerCase() &&
          BigInt(log.data) >= BigInt(payMicro),
      );
      if (!landed) {
        throw new Error(`PROOF_OF_PAYMENT_FAILED: catch-up ${hash} moved no USDC to ${dest}.`);
      }

      remaining -= payMicro;
      const coveredIds = details
        .filter((d) => d.dest === dest && d.status !== "REAL_TRANSFER")
        .map((d) => d.id)
        .slice(0, 200);

      const { error: insertError } = await supabase.from("synapse_credit_ledger").insert({
        reference_id: `CATCHUP-${dest.slice(0, 10)}-${Date.now()}`,
        transaction_type: dest.toLowerCase() === SYSTEM_CASH_REGISTER.toLowerCase() ? "hub_protocol_fee" : "ecosystem_war_chest",
        amount: payMicro / 1e6,
        amount_usdc: payMicro / 1e6,
        status: "completed",
        is_settled: true,
        blockchain_tx_hash: hash,
        description: `Catch-up settlement for unpaid legacy legs → ${dest}`,
        metadata: {
          class: "LEGACY_CATCHUP",
          destination: dest,
          owed_usdc: owedMicro / 1e6,
          paid_usdc: payMicro / 1e6,
          covers_ledger_ids: coveredIds,
        },
      });
      if (insertError) console.error(`[ERROR: legacy-catchup.Ledger] ${insertError.message}`);

      report.transfers.push({
        destination: dest,
        owed_usdc: owedMicro / 1e6,
        paid_usdc: payMicro / 1e6,
        remaining_gap_usdc: (owedMicro - payMicro) / 1e6,
        tx: hash,
        status: owedMicro === payMicro ? "settled" : "partial",
      });
      console.info(`[END: legacy-catchup.Pay:${dest}] paid=${payMicro} tx=${hash}`);
    }

    report.unfunded_gap_usdc = Math.max(0, totalShortfall - (relayerMicro - remaining)) / 1e6;
    console.info(`[END: legacy-catchup] ms=${Date.now() - started} gap=${report.unfunded_gap_usdc}`);
    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(`[FATAL: legacy-catchup] ${error?.message ?? error}`);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
