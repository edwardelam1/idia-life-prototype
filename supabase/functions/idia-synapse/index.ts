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
    console.log('IDIA-Synapse: Request received, method:', req.method);
    console.log('IDIA-Synapse: Request headers:', Object.fromEntries(req.headers.entries()));
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
    
    console.log('IDIA-Synapse: Full request body received:', JSON.stringify(requestBody, null, 2));
    console.log('IDIA-Synapse: Request body type:', typeof requestBody);
    console.log('IDIA-Synapse: Request body keys:', Object.keys(requestBody));
    
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

    // All direct calls should now go through health-data-bridge
    if (requestBody.user_id || requestBody.health_data) {
      console.error('DEPRECATED: Direct UI calls detected. Format received:', JSON.stringify(requestBody, null, 2));
      return new Response(JSON.stringify({
        error: 'Direct calls deprecated. Use health-data-bridge endpoint instead.',
        recommended_endpoint: '/functions/v1/health-data-bridge',
        message: 'IDIA-Synapse is now purely an orchestration function triggered by database events.',
        received_format: requestBody
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error('IDIA-Synapse: Invalid request format. Received:', JSON.stringify(requestBody, null, 2));
    console.error('IDIA-Synapse: Expected format: {"raw_data_id": "uuid", "orchestration_mode": true}');
    return new Response(JSON.stringify({
      error: 'Invalid request format',
      expected: 'orchestration_mode with raw_data_id',
      received: requestBody
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });


  } catch (error) {
    console.error('Error in IDIA-Synapse:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})