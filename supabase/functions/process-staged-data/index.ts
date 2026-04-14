// IDIA Protocol: Staged Data Orchestrator (SPEC-AI.5.2)
// Orchestrates: calculate-enhanced-rewards → credit-user-wallet
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

    console.log(`[Orchestrator] Processing staged_data: ${staged_data_id}, credits: ${credits_spent}`);

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

    // Step 2: Fetch staged data to get user_id
    const { data: stagedData, error: fetchError } = await supabase
      .from("staged_data")
      .select("user_id")
      .eq("id", staged_data_id)
      .maybeSingle();

    if (fetchError || !stagedData) {
      console.error("Failed to fetch staged data for user_id:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch staged data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Disseminate to cash account via FBO settlement
    const { error: creditError } = await supabase.functions.invoke(
      "credit-user-wallet",
      {
        body: {
          user_id: stagedData.user_id,
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

    console.log(`[Orchestrator] Settlement complete: $${rewardAmount} → user ${stagedData.user_id}`);

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
