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

    console.log('Starting nightly data processing...');

    // Process unprocessed staged_data entries
    const { data: unprocessedData, error: fetchError } = await supabase
      .from('staged_data')
      .select('*')
      .is('reward_calculated', false)
      .order('processed_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Failed to fetch unprocessed data:', fetchError);
      return new Response('Failed to fetch data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const data of unprocessedData || []) {
      try {
        // Process each staged data entry
        const { error: processError } = await supabase.functions.invoke(
          'process-staged-data',
          {
            body: { staged_data_id: data.id }
          }
        );

        if (processError) {
          console.error(`Failed to process staged data ${data.id}:`, processError);
          errorCount++;
        } else {
          processedCount++;
          console.log(`Successfully processed staged data ${data.id}`);
        }
      } catch (error) {
        console.error(`Error processing staged data ${data.id}:`, error);
        errorCount++;
      }
    }

    // Process unprocessed health metrics
    const { data: unprocessedHealthMetrics, error: healthFetchError } = await supabase
      .from('health_metrics')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (!healthFetchError && unprocessedHealthMetrics) {
      for (const metric of unprocessedHealthMetrics) {
        try {
          // Convert health metrics to health data format
          const healthData = {
            steps: metric.step_count || 0,
            heartRate: 70 + Math.floor(Math.random() * 20), // Simulated
            activeMinutes: Math.floor((metric.step_count || 0) / 120),
            sleepHours: '7.5',
            calories: Math.floor((metric.step_count || 0) * 0.04),
            health_metric_id: metric.id.toString()
          };

          // Trigger IDIA-Synapse for processing
          const { error: synapseError } = await supabase.functions.invoke(
            'idia-synapse',
            {
              body: {
                user_id: metric.user_id,
                health_data: healthData
              }
            }
          );

          if (synapseError) {
            console.error(`Failed to process health metric ${metric.id}:`, synapseError);
          } else {
            console.log(`Successfully processed health metric ${metric.id}`);
          }
        } catch (error) {
          console.error(`Error processing health metric ${metric.id}:`, error);
        }
      }
    }

    // Clean up old processed data (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: cleanupError } = await supabase
      .from('staged_health_data')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.warn('Failed to cleanup old staged health data:', cleanupError);
    }

    console.log(`Nightly processing completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: processedCount,
      error_count: errorCount,
      total_found: unprocessedData?.length || 0,
      timestamp: new Date().toISOString()
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in nightly data processor:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})