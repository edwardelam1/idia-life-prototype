import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, reward_amount, currency, source, description } = await req.json();

    if (!user_id || !reward_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, reward_amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currency !== "USD") {
      return new Response(
        JSON.stringify({ error: "Strict Compliance Violation: FBO Cash Wallet only accepts USD transactions." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = parseFloat(reward_amount);
    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid reward_amount: must be a positive number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FBO Cash] Settlement: $${amount.toFixed(4)} USD for ${user_id}`);

    // 1. Update the Fiat Cash Balance (idia_beta_balance)
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("idia_beta_balance, total_earned")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!wallet) {
      const { error: insertErr } = await supabase.from("user_wallets").insert({
        user_id,
        idia_beta_balance: amount,
        total_earned: amount,
      });
      if (insertErr) {
        console.error("[FBO Cash] Wallet insert failed:", insertErr);
        return new Response(
          JSON.stringify({ error: "Failed to create wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { error: updateErr } = await supabase.from("user_wallets").update({
        idia_beta_balance: Number(wallet.idia_beta_balance || 0) + amount,
        total_earned: Number(wallet.total_earned || 0) + amount,
      }).eq("user_id", user_id);
      if (updateErr) {
        console.error("[FBO Cash] Wallet update failed:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to update wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Write to the dedicated Fiat Ledger (NOT synapse_credit_ledger)
    const { error: ledgerErr } = await supabase.from("fiat_ledger").insert({
      user_id,
      amount_usd: amount,
      transaction_type: "credit",
      source: source || "fbo_dissemination",
      description: description || "Fiat Settlement",
      status: "settled_to_fbo",
    });

    if (ledgerErr) {
      console.error("[FBO Cash] Fiat ledger write failed:", ledgerErr);
      // Non-fatal — wallet was already credited
    }

    console.log(`[FBO Cash] ✅ Settlement complete: $${amount.toFixed(4)} → user ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, settled_usd: amount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FBO Cash] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
