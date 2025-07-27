
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced reward calculation based on your specifications
interface RewardFactors {
  base_reward: number;
  quality_multiplier: number;
  uniqueness_bonus: number;
  frequency_bonus: number;
  data_completeness_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { staged_data_id } = await req.json();

    if (!staged_data_id) {
      return new Response('Missing staged_data_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Fetch staged data
    const { data: stagedData, error: fetchError } = await supabase
      .from('staged_data')
      .select('*')
      .eq('id', staged_data_id)
      .maybeSingle();

    if (fetchError || !stagedData) {
      return new Response('Staged data not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Calculate enhanced rewards based on Year 2 projections
    const rewardFactors = calculateRewardFactors(stagedData);
    
    // Base reward structure aligned with $30 annual average per user
    // This translates to ~$2.50 per month average
    const baseMonthlyTarget = 2.50;
    const dailyBaseReward = baseMonthlyTarget / 30; // ~$0.083 per day
    
    let finalReward = dailyBaseReward * rewardFactors.quality_multiplier;
    finalReward += rewardFactors.uniqueness_bonus;
    finalReward += rewardFactors.frequency_bonus;
    
    // Apply data completeness multiplier
    finalReward *= rewardFactors.data_completeness_score;
    
    // Ensure minimum and maximum bounds per activity
    const minReward = 0.05; // 5 cents minimum
    const maxReward = 1.00; // $1 maximum per activity
    
    finalReward = Math.max(minReward, Math.min(finalReward, maxReward));

    // Check user's monthly earnings for payout eligibility
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', stagedData.user_id)
      .maybeSingle();

    let payoutEligible = false;
    let projectedMonthlyEarnings = 0;

    if (userWallet) {
      projectedMonthlyEarnings = (userWallet.total_earned || 0) + finalReward;
      
      // Check if user will be eligible for minimum payout ($1-2 range)
      payoutEligible = projectedMonthlyEarnings >= 1.00;
    }

    // Update staged data with calculated reward
    const { error: updateError } = await supabase
      .from('staged_data')
      .update({
        reward_amount: finalReward,
        reward_calculated: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', staged_data_id);

    if (updateError) {
      console.error('Failed to update staged data:', updateError);
      return new Response('Failed to update reward', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Enhanced reward calculated: $${finalReward.toFixed(4)} for activity ${stagedData.activity_type}`);
    console.log(`Projected monthly earnings: $${projectedMonthlyEarnings.toFixed(2)}`);
    console.log(`Payout eligible: ${payoutEligible}`);

    return new Response(JSON.stringify({
      success: true,
      reward_amount: finalReward,
      reward_factors: rewardFactors,
      projected_monthly_earnings: projectedMonthlyEarnings,
      payout_eligible: payoutEligible,
      payout_info: {
        minimum_monthly: 1.00,
        maximum_monthly: 15.00,
        average_target: 30.00 // annual
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating enhanced rewards:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

function calculateRewardFactors(stagedData: any): RewardFactors {
  let base_reward = 1.0; // Base token reward
  let quality_multiplier = 1.0;
  let uniqueness_bonus = 0.0;
  let frequency_bonus = 0.0;
  let data_completeness_score = 0.5; // Start at 50%
  
  // Data completeness scoring based on effort_score and available metrics
  const effortScore = stagedData.effort_score || 0;
  const heartRate = stagedData.average_heartrate || 0;
  const duration = stagedData.duration_seconds || 0;
  const distance = stagedData.distance_meters || 0;
  
  // Base completeness from effort score
  if (effortScore > 0) data_completeness_score = 0.7;
  if (effortScore > 70) data_completeness_score = 0.85;
  if (effortScore > 85) data_completeness_score = 1.0;
  
  // Bonus for additional metrics
  if (heartRate > 0) data_completeness_score += 0.1;
  if (duration > 0) data_completeness_score += 0.05;
  if (distance > 0) data_completeness_score += 0.05;
  
  data_completeness_score = Math.min(1.0, data_completeness_score);
  
  // Activity type and effort-based bonuses  
  if (effortScore >= 85) {
    uniqueness_bonus = 0.20; // High activity bonus
    quality_multiplier = 2.0;
  } else if (effortScore >= 70) {
    uniqueness_bonus = 0.10; // Good activity bonus
    quality_multiplier = 1.5;
  } else if (effortScore >= 50) {
    uniqueness_bonus = 0.05; // Moderate activity bonus
    quality_multiplier = 1.2;
  }
  
  return {
    base_reward,
    quality_multiplier,
    uniqueness_bonus,
    frequency_bonus,
    data_completeness_score
  };
}
