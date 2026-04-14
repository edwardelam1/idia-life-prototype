// IDIA Protocol: FBO Fiat Dissemination (SPEC-AI.5.2)
// Credits user_wallets.cash_balance — the liquid cash account
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
    });

    const body = await req.json();

    // Fuzzy key matching for cross-platform compat
    const user_id = body.user_id || body.userId || body.config?.user_id;
    const reward_amount = body.reward_amount || body.rewardAmount;
    const source = body.source || "fbo_dissemination";
    const description = body.description || "Synapse consumption reward";
    const staged_data_id = body.staged_data_id || body.stagedDataId || null;

    if (!user_id || !reward_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, reward_amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = parseFloat(reward_amount);
    console.log(`[FBO] Disseminating $${amount.toFixed(4)} to user ${user_id} (source: ${source})`);

    // Upsert into user_wallets — increment cash_balance and total_earned
    const { data: existingWallet, error: fetchError } = await supabase
      .from("user_wallets")
      .select("cash_balance, total_earned")
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch user_wallets:", fetchError);
    }

    let newCashBalance: number;
    let newTotalEarned: number;

    if (!existingWallet) {
      // Create new wallet row
      newCashBalance = amount;
      newTotalEarned = amount;

      const { error: insertError } = await supabase
        .from("user_wallets")
        .insert({
          user_id,
          cash_balance: newCashBalance,
          total_earned: newTotalEarned,
        });

      if (insertError) {
        console.error("Failed to create user_wallets row:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Increment existing balances
      newCashBalance = Number(existingWallet.cash_balance || 0) + amount;
      newTotalEarned = Number(existingWallet.total_earned || 0) + amount;

      const { error: updateError } = await supabase
        .from("user_wallets")
        .update({
          cash_balance: newCashBalance,
          total_earned: newTotalEarned,
        })
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Failed to update user_wallets:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id,
        transaction_type: "earn",
        amount,
        description,
        source,
      })
      .select("id")
      .single();

    if (txError) {
      console.error("Failed to create transaction record:", txError);
    }

    console.log(`[FBO] Settlement complete: $${amount.toFixed(4)} → cash_balance=$${newCashBalance.toFixed(4)}`);

    return new Response(
      JSON.stringify({
        success: true,
        new_cash_balance: newCashBalance,
        new_total_earned: newTotalEarned,
        reward_amount: amount,
        transaction_id: transaction?.id || null,
        source,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[FBO] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
