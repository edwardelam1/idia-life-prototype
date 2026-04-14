// IDIA Protocol: Staged Data Orchestrator (SPEC-AI.5.2)
// Orchestrates: calculate-enhanced-rewards → credit-user-wallet
// Idempotent: checks reward_calculated before processing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const staged_data_id = body.staged_data_id;
    const credits_spent = body.credits_spent || 1;

    if (!staged_data_id) {
      return new Response(
        JSON.stringify({ error: "Missing staged_data_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Orchestrator] Processing staged_health_data: ${staged_data_id}`);

    // Step 0: Idempotency check — skip if already rewarded
    const { data: checkData } = await supabase
      .from("staged_health_data")
      .select("reward_calculated, raw_data_id, pseudo_user_id")
      .eq("id", staged_data_id)
      .maybeSingle();

    if (!checkData) {
      return new Response(
        JSON.stringify({ error: "Staged health data not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (checkData.reward_calculated === true) {
      console.log(`[Orchestrator] Already processed: ${staged_data_id}, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Calculate weighted reward
    const { data: rewardResult, error: rewardError } = await supabase.functions.invoke(
      "calculate-enhanced-rewards",
      { body: { staged_data_id, credits_spent } }
    );

    if (rewardError) {
      console.error("[Orchestrator] Reward calculation failed:", rewardError);
      return new Response(
        JSON.stringify({ error: "Reward calculation failed", details: rewardError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rewardAmount = rewardResult?.reward_amount;
    if (!rewardAmount || rewardAmount <= 0) {
      console.error("[Orchestrator] No reward_amount:", rewardResult);
      return new Response(
        JSON.stringify({ error: "No reward amount calculated", result: rewardResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Resolve real user_id via raw_data_id → raw_health_data.user_id
    let userId: string | null = null;

    if (checkData.raw_data_id) {
      const { data: rawData } = await supabase
        .from("raw_health_data")
        .select("user_id")
        .eq("id", checkData.raw_data_id)
        .maybeSingle();

      if (rawData?.user_id) {
        userId = rawData.user_id;
      }
    }

    // Fallback: reverse-lookup via pseudo_user_id → profiles
    if (!userId && checkData.pseudo_user_id) {
      const { data: matchResult } = await supabase.rpc("get_user_id_from_pseudonym", {
        p_pseudo_id: checkData.pseudo_user_id,
      });
      if (matchResult) {
        userId = matchResult;
      }
    }

    if (!userId) {
      console.error("[Orchestrator] Could not resolve user_id for staged_data:", staged_data_id);
      return new Response(
        JSON.stringify({ error: "Could not resolve user_id for payout" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Orchestrator] Resolved user_id: ${userId}, reward: $${rewardAmount}`);

    // Step 3: Credit user wallet
    const { data: creditResult, error: creditError } = await supabase.functions.invoke(
      "credit-user-wallet",
      {
        body: {
          user_id: userId,
          reward_amount: rewardAmount,
          staged_data_id,
          source: "fbo_dissemination",
          description: `Synapse settlement: ${credits_spent} credit(s) @ $0.75`,
        },
      }
    );

    if (creditError) {
      console.error("[Orchestrator] FBO dissemination failed:", creditError);
      return new Response(
        JSON.stringify({ error: "Failed to credit wallet", details: creditError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Orchestrator] ✅ Settlement complete: $${rewardAmount} → user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        reward_amount: rewardAmount,
        reward_details: rewardResult,
        credit_result: creditResult,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
