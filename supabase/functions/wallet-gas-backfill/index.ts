// One-time-per-wallet gas backfill: funds every wallet linked to a profile
// that never received its genesis drip. Targets come only from the database,
// and wallet_provisioning_logs locks each address, so re-runs are harmless.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { createPublicClient, createWalletClient, http, parseEther } from "https://esm.sh/viem@2.9.20";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DRIP_AMOUNT_ETH = "0.00005";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[BACKFILL] >>> BEGIN");
  const results: Record<string, string> = {};
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const key = Deno.env.get("TREASURY_PRIVATE_KEY");
    if (!key) throw new Error("Missing Treasury Key");
    const account = privateKeyToAccount(`0x${key.replace(/^0x/, "")}` as `0x${string}`);
    const rpc = http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org");
    const pub = createPublicClient({ chain: base, transport: rpc });
    const wallet = createWalletClient({ account, chain: base, transport: rpc });

    const { data: profiles, error } = await supabase
      .from("profiles").select("wallet_address").not("wallet_address", "is", null);
    if (error) throw error;
    const { data: logs } = await supabase.from("wallet_provisioning_logs").select("wallet_address");
    const funded = new Set((logs ?? []).map((l: any) => String(l.wallet_address).toLowerCase()));
    const targets = [...new Set((profiles ?? [])
      .map((p: any) => String(p.wallet_address).toLowerCase())
      .filter((a) => /^0x[0-9a-f]{40}$/.test(a) && !funded.has(a)))];
    console.log(`[BACKFILL] --- DATA: ${targets.length} unfunded wallets`);

    const need = parseEther(DRIP_AMOUNT_ETH) * BigInt(targets.length + 1);
    const bal = await pub.getBalance({ address: account.address });
    console.log(`[BACKFILL] --- DATA: treasury ${account.address} balance=${bal} need=${need}`);
    if (bal < need) throw new Error(`TREASURY_EMPTY: balance ${bal} < needed ${need}`);

    let nonce = await pub.getTransactionCount({ address: account.address, blockTag: "pending" });
    for (const addr of targets) {
      try {
        // Lock first so a concurrent drip can't double-fund.
        const { error: lockErr } = await supabase.from("wallet_provisioning_logs").insert({
          wallet_address: addr, tx_hash: "pending", amount_eth: DRIP_AMOUNT_ETH, status: "backfill_pending",
        });
        if (lockErr) { results[addr] = `skipped: ${lockErr.message}`; continue; }
        const hash = await wallet.sendTransaction({ to: addr as `0x${string}`, value: parseEther(DRIP_AMOUNT_ETH), nonce: nonce++ });
        await supabase.from("wallet_provisioning_logs").update({ tx_hash: hash, status: "broadcasted" }).eq("wallet_address", addr);
        results[addr] = hash;
        console.log(`[BACKFILL] --- SENT ${addr} ${hash}`);
      } catch (e: any) {
        results[addr] = `failed: ${e?.message ?? e}`;
        await supabase.from("wallet_provisioning_logs").delete().eq("wallet_address", addr).eq("status", "backfill_pending");
        console.error(`[BACKFILL] --- FAILED ${addr}: ${e?.message ?? e}`);
      }
    }
    console.log("[BACKFILL] <<< END", JSON.stringify(results));
    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(`[BACKFILL] <<< END FATAL ${e?.message ?? e}`);
    return new Response(JSON.stringify({ error: e?.message ?? String(e), results }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
