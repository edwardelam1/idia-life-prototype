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

    console.log(`Health-data-bridge: Ingesting raw health data for user: ${user_id}`);
    console.log('Raw health data received:', health_data);

    // Step 1: ONLY insert raw data into raw_health_data table
    // This is the SINGLE point of entry for all health data
    const { data: rawHealthData, error: rawError } = await supabase
      .from('raw_health_data')
      .insert({
        user_id: user_id,
        device_type: 'iPhone Health App',
        raw_payload: health_data,
        step_count: health_data.steps || 0,
        recorded_at: new Date().toISOString(),
        processed: false
      })
      .select()
      .single();

    if (rawError) {
      console.error('Failed to insert raw health data:', rawError);
      return new Response('Failed to insert raw health data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Raw health data inserted successfully. Database trigger will handle processing.', rawHealthData);

    // Return immediately - the database trigger will handle all processing
    return new Response(JSON.stringify({
      success: true,
      message: 'Health data ingested successfully. Processing will begin automatically.',
      raw_data_id: rawHealthData.id
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in health-data-bridge:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})