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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestBody = await req.json();
    
    console.log('IDIA-Synapse orchestrator received request:', requestBody);
    
    // Check if this is orchestration mode (from database trigger)
    if (requestBody.orchestration_mode && requestBody.raw_data_id) {
      console.log('ORCHESTRATION MODE: Processing raw_data_id:', requestBody.raw_data_id);
      
      // Fetch the raw health data
      const { data: rawData, error: fetchError } = await supabase
        .from('raw_health_data')
        .select('*')
        .eq('id', requestBody.raw_data_id)
        .single();

      if (fetchError || !rawData) {
        console.error('Failed to fetch raw health data:', fetchError);
        return new Response('Raw data not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }

      // Step 1: Call anonymization-processor with raw data
      console.log('Orchestrating: Calling anonymization-processor...');
      const { data: anonResult, error: anonError } = await supabase.functions.invoke(
        'anonymization-processor',
        {
          body: {
            raw_data_id: rawData.id,
            user_id: rawData.user_id,
            raw_payload: rawData.raw_payload,
            step_count: rawData.step_count,
            recorded_at: rawData.recorded_at
          }
        }
      );

      if (anonError) {
        console.error('Anonymization processor failed:', anonError);
        return new Response('Anonymization failed', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      // Step 2: Mark raw data as processed
      await supabase
        .from('raw_health_data')
        .update({ 
          processed: true, 
          processing_completed_at: new Date().toISOString() 
        })
        .eq('id', rawData.id);

      console.log('IDIA-Synapse orchestration completed successfully');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Data processing orchestrated successfully',
        raw_data_id: rawData.id,
        anonymization_result: anonResult
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Legacy support for direct UI calls (will be deprecated)
    if (requestBody.user_id && requestBody.health_data) {
      console.log('LEGACY MODE: Direct UI call detected, redirecting to health-data-bridge pattern...');
      
      // Insert into raw_health_data table, trigger will handle the rest
      const { data: rawHealthData, error: rawError } = await supabase
        .from('raw_health_data')
        .insert({
          user_id: requestBody.user_id,
          device_type: 'Legacy UI Call',
          raw_payload: requestBody.health_data,
          step_count: requestBody.health_data.steps || 0,
          recorded_at: new Date().toISOString(),
          processed: false
        })
        .select()
        .single();

      if (rawError) {
        console.error('Failed to insert raw health data:', rawError);
        return new Response('Failed to process legacy call', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Legacy call processed. Data will be handled by the new pipeline.',
        raw_data_id: rawHealthData.id
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error('Invalid request format:', requestBody);
    return new Response('Invalid request format - expected orchestration_mode with raw_data_id', { 
      status: 400, 
      headers: corsHeaders 
    });


  } catch (error) {
    console.error('Error in IDIA-Synapse:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})