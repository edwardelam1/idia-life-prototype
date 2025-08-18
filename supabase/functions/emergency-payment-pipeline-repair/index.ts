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
    );

    console.log('Emergency Pipeline Repair: Starting payment pipeline recovery...');

    // Get all processed raw health data that should have staged_data but don't
    const { data: missingStaged, error: fetchError } = await supabase
      .from('raw_health_data')
      .select(`
        id,
        user_id,
        raw_payload,
        step_count,
        recorded_at,
        created_at,
        device_type
      `)
      .eq('processed', true)
      .is('user_id', 'not.null')
      .gte('created_at', '2024-07-28')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch missing staged data:', fetchError);
      return new Response('Failed to fetch data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Found ${missingStaged?.length || 0} records to process`);

    let processedCount = 0;
    let errorCount = 0;
    const processedRecords = [];

    // Process each record
    for (const record of missingStaged || []) {
      try {
        // Check if staged_data already exists for this raw_data_id
        const { data: existingStaged } = await supabase
          .from('staged_data')
          .select('id')
          .eq('raw_data_id', record.id)
          .maybeSingle();

        if (existingStaged) {
          console.log(`Staged data already exists for raw_data_id: ${record.id}, skipping`);
          continue;
        }

        // Extract data from raw_payload
        const payload = record.raw_payload || {};
        const stepCount = record.step_count || payload.steps || payload.stepCount || 0;
        const heartRate = payload.heart_rate || payload.heartRate || payload.averageHeartRate || null;
        const duration = payload.duration || payload.duration_seconds || null;
        const distance = payload.distance || payload.distance_meters || null;
        const calories = payload.calories || payload.activeEnergyBurned || null;

        // Create staged_data entry for reward processing
        const stagedData = {
          user_id: record.user_id,
          raw_data_id: record.id,
          activity_type: 'health_metrics',
          anonymized_location_zone: 'ZONE_BACKLOG_REPAIR',
          processed_at: new Date().toISOString(),
          step_count: stepCount,
          average_heartrate: heartRate,
          duration_seconds: duration,
          distance_meters: distance,
          calories_burned: calories,
          device_type: record.device_type || 'Apple Health',
          data_quality_score: heartRate ? 0.8 : 0.6,
          data_completeness_score: 0.7,
          elevation_gain_meters: null,
          weather_conditions: null
        };

        console.log(`Creating staged_data for raw_data_id: ${record.id} with steps=${stepCount}, hr=${heartRate}`);

        const { data: newStaged, error: stagedError } = await supabase
          .from('staged_data')
          .insert(stagedData)
          .select()
          .single();

        if (stagedError) {
          console.error(`Failed to create staged_data for ${record.id}:`, stagedError);
          errorCount++;
          continue;
        }

        // Process rewards immediately
        try {
          const { data: rewardResult, error: rewardError } = await supabase.functions.invoke(
            'calculate-enhanced-rewards',
            {
              body: { staged_data_id: newStaged.id }
            }
          );

          if (rewardError) {
            console.error(`Reward calculation failed for ${newStaged.id}:`, rewardError);
          } else {
            console.log(`Reward calculated for ${newStaged.id}:`, rewardResult);
          }

          // Credit user wallet
          const { error: creditError } = await supabase.functions.invoke(
            'credit-user-wallet',
            {
              body: {
                user_id: record.user_id,
                reward_amount: newStaged.reward_amount || 0.50,
                staged_data_id: newStaged.id
              }
            }
          );

          if (creditError) {
            console.error(`Failed to credit wallet for ${record.user_id}:`, creditError);
          } else {
            console.log(`Wallet credited for user ${record.user_id}`);
          }

        } catch (processError) {
          console.error(`Error processing rewards for ${newStaged.id}:`, processError);
        }

        processedRecords.push({
          raw_data_id: record.id,
          staged_data_id: newStaged.id,
          user_id: record.user_id,
          created_at: record.created_at
        });

        processedCount++;

      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        errorCount++;
      }
    }

    // Final summary
    console.log(`Emergency Pipeline Repair Complete: ${processedCount} processed, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment pipeline repair completed',
      statistics: {
        total_records_found: missingStaged?.length || 0,
        successfully_processed: processedCount,
        errors: errorCount,
        recovery_period: 'July 28, 2024 onwards'
      },
      processed_records: processedRecords
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Emergency Pipeline Repair Error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})