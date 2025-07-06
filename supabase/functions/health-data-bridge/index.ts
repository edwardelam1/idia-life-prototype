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

    const { user_id, health_data } = await req.json();

    if (!user_id || !health_data) {
      return new Response('Missing user_id or health_data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing health data from iPhone for user: ${user_id}`);
    console.log('Health data received:', health_data);

    // Insert health metrics directly into the database
    const { data: healthMetric, error: healthError } = await supabase
      .from('health_metrics')
      .insert({
        user_id: user_id,
        step_count: health_data.steps || 0,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (healthError) {
      console.error('Failed to insert health metric:', healthError);
      return new Response('Failed to insert health metric', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Health metric inserted successfully:', healthMetric);

    // Also call data_ingestor for device events tracking
    const { error: ingestorError } = await supabase.functions.invoke('data_ingestor', {
      body: {
        event_type: 'health_sync',
        payload: health_data,
        timestamp: new Date().toISOString()
      },
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (ingestorError) {
      console.error('Data ingestor error:', ingestorError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Health data processed successfully',
      health_metric_id: healthMetric.id
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing health data:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})