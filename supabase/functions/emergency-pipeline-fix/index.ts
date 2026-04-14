import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('EMERGENCY PIPELINE FIX: Starting immediate recovery...');

    let results = {
      processed_count: 0,
      reward_total: 0,
      errors: [] as string[]
    };

    // Get all recent processed health data since July 24th
    const { data: recentData, error: dataError } = await supabase
      .from('raw_health_data')
      .select('id, user_id, raw_payload, step_count, recorded_at')
      .eq('processed', true)
      .gte('recorded_at', '2025-07-24T00:00:00')
      .order('recorded_at', { ascending: false });

    if (dataError) {
      throw new Error(`Failed to fetch recent data: ${dataError.message}`);
    }

    console.log(`Found ${recentData?.length || 0} processed health records since July 24th`);

    for (const record of recentData || []) {
      try {
        console.log(`Processing record ${record.id} from ${record.recorded_at}`);

        const payload = record.raw_payload || {};
        const stepCount = payload.value || payload.steps || record.step_count || 0;

        // Generate pseudonym for anonymized staging
        const encoder = new TextEncoder();
        const data = encoder.encode(record.user_id + 'IDIA_SALT_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const pseudoUserId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create properly formatted staged_health_data
        const rewardData = {
          pseudo_user_id: pseudoUserId,
          raw_data_id: record.id,
          activity_type: 'health_metrics',
          anonymized_location_zone: 'ZONE_RECOVERY',
          processed_at: new Date().toISOString(),
          average_heartrate: payload.heartRate || null,
          duration_seconds: payload.exerciseTime ? (payload.exerciseTime * 60) : null,
          distance_meters: payload.distanceWalkingRunning || null,
          steps_count: stepCount,
          effort_score: stepCount > 5000 ? 85 : stepCount > 1000 ? 70 : 50,
          device_type: 'Apple Health',
          data_quality_score: payload.heartRate ? 0.8 : 0.6,
          data_completeness_score: 0.7,
          reward_calculated: false
        };

        const { data: stagedData, error: stagedError } = await supabase
          .from('staged_health_data')
          .insert(rewardData)
          .select()
          .single();

        if (stagedError) {
          console.error(`Failed to create staged_health_data for ${record.id}:`, stagedError);
          results.errors.push(`${record.id}: ${stagedError.message}`);
          continue;
        }

        // Calculate rewards immediately
        const { data: rewardResult, error: rewardError } = await supabase.functions.invoke(
          'calculate-enhanced-rewards',
          {
            body: { staged_data_id: stagedData.id }
          }
        );

        if (rewardError) {
          console.error(`Failed to calculate rewards for ${stagedData.id}:`, rewardError);
          results.errors.push(`Reward calc ${stagedData.id}: ${rewardError.message}`);
        } else {
          console.log(`Rewards calculated for ${stagedData.id}: $${rewardResult?.reward_amount || 0}`);
          results.processed_count++;
          results.reward_total += rewardResult?.reward_amount || 0;
        }

        // Trigger wallet credit
        if (rewardResult?.reward_amount) {
          const { error: creditError } = await supabase.functions.invoke(
            'credit-user-wallet',
            {
              body: {
                user_id: record.user_id,
                reward_amount: rewardResult.reward_amount,
                staged_data_id: stagedData.id
              }
            }
          );

          if (creditError) {
            console.error(`Failed to credit wallet for ${record.user_id}:`, creditError);
            results.errors.push(`Wallet credit ${record.user_id}: ${creditError.message}`);
          }
        }

      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        results.errors.push(`${record.id}: ${error.message}`);
      }
    }

    console.log('EMERGENCY FIX COMPLETE:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Emergency pipeline fix completed',
      results: results,
      summary: {
        records_processed: results.processed_count,
        total_rewards_recovered: `$${results.reward_total.toFixed(4)}`,
        error_count: results.errors.length
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in emergency pipeline fix:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})