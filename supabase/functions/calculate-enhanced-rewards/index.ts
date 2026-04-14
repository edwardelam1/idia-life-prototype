// IDIA Protocol: Global Synapse Settlement Engine (SPEC-AI.5.2)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SPEC-AI.5.2 Constants — hardcoded per protocol spec
const CREDIT_VALUE_USD = 0.75;
const REVENUE_SHARE_PERCENT = 0.30;
const MIN_REWARD = 0.05;
const MAX_REWARD = 1.00;

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

    console.log(`[SPEC-AI.5.2] Processing staged_data: ${staged_data_id}, credits_spent: ${credits_spent}`);

    // 1. Fetch staged data record
    const { data: stagedData, error: fetchError } = await supabase
      .from("staged_data")
      .select("*")
      .eq("id", staged_data_id)
      .maybeSingle();

    if (fetchError || !stagedData) {
      console.error("Staged data not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Staged data not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. FBO Conversion — pool math
    const totalValueUSD = credits_spent * CREDIT_VALUE_USD;
    const revenueSharePool = totalValueUSD * REVENUE_SHARE_PERCENT;

    console.log(`[SPEC-AI.5.2] Pool: $${totalValueUSD.toFixed(4)} total → $${revenueSharePool.toFixed(4)} rev share`);

    // 3. Participant count — check for associated bundle, fallback to 1
    let participantCount = 1;
    if (stagedData.raw_data_id) {
      const { data: bundleData } = await supabase
        .from("marketplace_bundles")
        .select("participant_count")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (bundleData?.participant_count && bundleData.participant_count > 0) {
        participantCount = bundleData.participant_count;
      }
    }

    const baseShare = revenueSharePool / participantCount;

    // 4. Synapse Weighting — quality + completeness
    //    Fall back to effort-based scoring for health data compatibility
    let qualityScore = stagedData.data_quality_score;
    let completenessScore = stagedData.data_completeness_score;

    if (qualityScore == null || completenessScore == null) {
      // Effort-based fallback from health pipeline
      const effortScore = stagedData.effort_score || 0;
      const heartRate = stagedData.average_heartrate || 0;
      const duration = stagedData.duration_seconds || 0;
      const distance = stagedData.distance_meters || 0;

      // Derive completeness from effort
      completenessScore = 0.5;
      if (effortScore > 0) completenessScore = 0.7;
      if (effortScore > 70) completenessScore = 0.85;
      if (effortScore > 85) completenessScore = 1.0;
      if (heartRate > 0) completenessScore = Math.min(1.0, completenessScore + 0.1);
      if (duration > 0) completenessScore = Math.min(1.0, completenessScore + 0.05);
      if (distance > 0) completenessScore = Math.min(1.0, completenessScore + 0.05);

      // Derive quality from effort tiers
      qualityScore = 0.5;
      if (effortScore >= 85) qualityScore = 1.0;
      else if (effortScore >= 70) qualityScore = 0.8;
      else if (effortScore >= 50) qualityScore = 0.65;
    }

    const weightCoefficient = (qualityScore + completenessScore) / 2;
    const rawReward = baseShare * weightCoefficient;
    const finalReward = Math.max(MIN_REWARD, Math.min(MAX_REWARD, rawReward));

    console.log(`[SPEC-AI.5.2] Weight: quality=${qualityScore}, completeness=${completenessScore}, coeff=${weightCoefficient.toFixed(4)}`);
    console.log(`[SPEC-AI.5.2] Reward: base=$${baseShare.toFixed(4)} × ${weightCoefficient.toFixed(4)} = $${finalReward.toFixed(4)}`);

    // 5. Audit — update staged_data with settlement result
    const { error: updateError } = await supabase
      .from("staged_data")
      .update({
        reward_amount: finalReward,
        reward_calculated: true,
        processed_at: new Date().toISOString(),
      })
      .eq("id", staged_data_id);

    if (updateError) {
      console.error("Failed to update staged data:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update reward" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reward_amount: finalReward,
        pool_details: {
          credits_spent,
          credit_value_usd: CREDIT_VALUE_USD,
          total_value_usd: totalValueUSD,
          revenue_share_pool: revenueSharePool,
          participant_count: participantCount,
          base_share: baseShare,
        },
        coefficient: weightCoefficient,
        quality_score: qualityScore,
        completeness_score: completenessScore,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[SPEC-AI.5.2] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
