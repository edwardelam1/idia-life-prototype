// IDIA Protocol: Staged Data Orchestrator (SPEC-AI.5.2)
// Orchestrates: calculate-enhanced-rewards → credit-user-wallet
// Uses staged_health_data (pseudo_user_id) with reverse-lookup via raw_health_data
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

    const { staged_data_id, credits_spent = 1 } = await req.json();

    if (!staged_data_id) {
      return new Response(
        JSON.stringify({ error: "Missing staged_data_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Orchestrator] Processing staged_health_data: ${staged_data_id}, credits: ${credits_spent}`);

    // Step 1: Calculate weighted reward via Global Settlement Engine
    const { data: rewardResult, error: rewardError } = await supabase.functions.invoke(
      "calculate-enhanced-rewards",
      { body: { staged_data_id, credits_spent } }
    );

    if (rewardError) {
      console.error("Reward calculation failed:", rewardError);
      return new Response(
        JSON.stringify({ error: "Reward calculation failed", details: rewardError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rewardAmount = rewardResult?.reward_amount;
    if (!rewardAmount) {
      console.error("No reward_amount in result:", rewardResult);
      return new Response(
        JSON.stringify({ error: "No reward amount calculated", result: rewardResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Reverse-lookup user_id via staged_health_data → raw_health_data
    const { data: stagedData, error: fetchError } = await supabase
      .from("staged_health_data")
      .select("pseudo_user_id, raw_data_id")
      .eq("id", staged_data_id)
      .maybeSingle();

    if (fetchError || !stagedData) {
      console.error("Failed to fetch staged_health_data:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch staged health data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;

    // Try reverse-lookup via raw_data_id → raw_health_data.user_id
    if (stagedData.raw_data_id) {
      const { data: rawData } = await supabase
        .from("raw_health_data")
        .select("user_id")
        .eq("id", stagedData.raw_data_id)
        .maybeSingle();

      if (rawData?.user_id) {
        userId = rawData.user_id;
      }
    }

    // Fallback: reverse-lookup via pseudo_user_id → profiles
    if (!userId && stagedData.pseudo_user_id) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id");

      if (profiles) {
        // Match pseudo_user_id against generate_pseudonym(user_id)
        // Use DB function for accuracy
        const { data: matchResult } = await supabase.rpc("get_user_id_from_pseudonym", {
          p_pseudo_id: stagedData.pseudo_user_id,
        });
        if (matchResult) {
          userId = matchResult;
        }
      }
    }

    if (!userId) {
      console.error("Could not resolve user_id from staged_health_data:", staged_data_id);
      return new Response(
        JSON.stringify({ error: "Could not resolve user_id for payout" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Disseminate to cash account via FBO settlement
    const { error: creditError } = await supabase.functions.invoke(
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
      console.error("FBO dissemination failed:", creditError);
      return new Response(
        JSON.stringify({ error: "Failed to credit wallet", details: creditError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Orchestrator] Settlement complete: $${rewardAmount} → user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        reward_amount: rewardAmount,
        reward_details: rewardResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
