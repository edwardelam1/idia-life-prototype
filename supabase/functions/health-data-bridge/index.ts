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
    console.log('Health-Data-Bridge: Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Health-Data-Bridge: Missing environment variables');
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestBody = await req.json();
    
    console.log('Health-Data-Bridge: Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { user_id, health_data } = requestBody;

    if (!user_id || !health_data) {
      console.error('Health-Data-Bridge: Missing required fields. user_id:', !!user_id, 'health_data:', !!health_data);
      return new Response(JSON.stringify({
        error: 'Missing required fields: user_id and health_data'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Health-Data-Bridge: Ingesting raw health data for user: ${user_id}`);
    console.log('Health-Data-Bridge: Raw health data received:', JSON.stringify(health_data, null, 2));

    // Insert into raw_health_data table - this will trigger the database trigger
    console.log('Health-Data-Bridge: Inserting into raw_health_data table...');
    const { data: rawHealthData, error: rawError } = await supabase
      .from('raw_health_data')
      .insert({
        user_id: user_id,
        raw_payload: health_data,
        step_count: health_data.step_count || health_data.steps || null,
        device_type: health_data.device_type || 'iPhone Health App',
        recorded_at: health_data.recorded_at || new Date().toISOString(),
        processed: false
      })
      .select()
      .single();

    if (rawError) {
      console.error('Health-Data-Bridge: Insert failed:', rawError);
      return new Response(JSON.stringify({
        error: 'Failed to insert health data',
        details: rawError
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Health-Data-Bridge: Successfully inserted raw data with ID:', rawHealthData.id);
    console.log('Health-Data-Bridge: Database trigger should now fire automatically');

    return new Response(JSON.stringify({
      success: true,
      message: 'Health data ingested successfully',
      raw_data_id: rawHealthData.id
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health-Data-Bridge: Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})