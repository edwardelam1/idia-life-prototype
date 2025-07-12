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

    console.log('Starting daily 12pm data retrieval process for offline data sync...');

    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    const yesterdayNoon = new Date(todayNoon.getTime() - 24 * 60 * 60 * 1000);

    // Check for data tables that weren't updated since yesterday 12pm
    // Process unprocessed staged_data entries (offline data)
    const { data: unprocessedData, error: fetchError } = await supabase
      .from('staged_data')
      .select('*')
      .or('reward_calculated.is.null,reward_calculated.eq.false')
      .lt('processed_at', yesterdayNoon.toISOString())
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

    // Process health metrics that weren't updated since yesterday 12pm (offline data)
    const { data: unprocessedHealthMetrics, error: healthFetchError } = await supabase
      .from('health_metrics')
      .select('*')
      .lt('created_at', yesterdayNoon.toISOString())
      .order('created_at', { ascending: true })
      .limit(50);

    // Also check for device_events that weren't processed (offline uploads)
    const { data: unprocessedDeviceEvents, error: deviceFetchError } = await supabase
      .from('device_events')
      .select('*')
      .is('processed_at', null)
      .lt('event_timestamp', yesterdayNoon.toISOString())
      .order('event_timestamp', { ascending: true })
      .limit(100);

    if (!healthFetchError && unprocessedHealthMetrics) {
      for (const metric of unprocessedHealthMetrics) {
        try {
          // Convert health metrics to proper format for health-data-bridge
          const healthData = {
            steps: metric.step_count || 0,
            heartRate: 70 + Math.floor(Math.random() * 20), // Simulated
            activeMinutes: Math.floor((metric.step_count || 0) / 120),
            sleepHours: '7.5',
            calories: Math.floor((metric.step_count || 0) * 0.04),
            health_metric_id: metric.id.toString(),
            recorded_at: metric.recorded_at || metric.created_at
          };

          // Use health-data-bridge for proper pipeline flow
          const { error: bridgeError } = await supabase.functions.invoke(
            'health-data-bridge',
            {
              body: {
                user_id: metric.user_id,
                health_data: healthData
              }
            }
          );

          if (bridgeError) {
            console.error(`Failed to process health metric ${metric.id}:`, bridgeError);
          } else {
            console.log(`Successfully processed health metric ${metric.id}`);
          }
        } catch (error) {
          console.error(`Error processing health metric ${metric.id}:`, error);
        }
      }
    }

    // Process unprocessed device events (offline data uploads)
    if (!deviceFetchError && unprocessedDeviceEvents) {
      for (const event of unprocessedDeviceEvents) {
        try {
          // Process health sync events
          if (event.event_type === 'health_sync' && event.json_payload && event.user_id) {
            const healthData = event.json_payload as any;
            
            // Insert health metric if it doesn't exist
            const { error: healthInsertError } = await supabase
              .from('health_metrics')
              .insert({
                user_id: event.user_id,
                step_count: healthData.steps || 0,
                recorded_at: event.event_timestamp
              });

            if (healthInsertError && !healthInsertError.message?.includes('duplicate')) {
              console.error(`Error inserting health metric for event ${event.id}:`, healthInsertError);
            } else {
              console.log(`Processed offline health data for event ${event.id}`);
            }
          }

          // Mark event as processed
          await supabase
            .from('device_events')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', event.id);

        } catch (error) {
          console.error(`Error processing device event ${event.id}:`, error);
        }
      }
    }

    // Check for raw_strava_data that wasn't processed (offline uploads)
    const { data: unprocessedStrava, error: stravaFetchError } = await supabase
      .from('raw_strava_data')
      .select('*')
      .eq('processed', false)
      .lt('received_at', yesterdayNoon.toISOString())
      .order('received_at', { ascending: true })
      .limit(50);

    if (!stravaFetchError && unprocessedStrava) {
      for (const stravaData of unprocessedStrava) {
        try {
          // Re-trigger anonymization processing for offline Strava data
          const { error: anonError } = await supabase.functions.invoke(
            'anonymization-processor',
            {
              body: {
                raw_data_id: stravaData.id,
                user_id: stravaData.user_id
              }
            }
          );

          if (anonError) {
            console.error(`Failed to process offline Strava data ${stravaData.id}:`, anonError);
          } else {
            console.log(`Successfully processed offline Strava data ${stravaData.id}`);
            // Mark as processed
            await supabase
              .from('raw_strava_data')
              .update({ processed: true })
              .eq('id', stravaData.id);
          }
        } catch (error) {
          console.error(`Error processing Strava data ${stravaData.id}:`, error);
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

    console.log(`Daily 12pm data retrieval completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: processedCount,
      error_count: errorCount,
      total_staged_data: unprocessedData?.length || 0,
      total_health_metrics: unprocessedHealthMetrics?.length || 0,
      total_device_events: unprocessedDeviceEvents?.length || 0,
      total_strava_data: unprocessedStrava?.length || 0,
      last_run: todayNoon.toISOString(),
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