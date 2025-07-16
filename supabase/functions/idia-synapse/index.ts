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
    console.log('IDIA-Synapse: Request URL:', req.url);
    
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
    
    // SAFETY MEASURE: Log request source for debugging invalid calls
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referer = req.headers.get('referer') || 'unknown';
    const xForwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
    console.log('IDIA-Synapse: Call source - User-Agent:', userAgent);
    console.log('IDIA-Synapse: Call source - Referer:', referer);
    console.log('IDIA-Synapse: Call source - X-Forwarded-For:', xForwardedFor);
    
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

      // Step 2: Mark raw data as processed with processing timestamps
      await supabase
        .from('raw_health_data')
        .update({ 
          processed: true, 
          processing_started_at: new Date().toISOString(),
          processing_completed_at: new Date().toISOString(),
          processing_status: 'completed'
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

    // SAFETY MEASURE: Reject ALL non-orchestration calls with detailed logging
    console.error('IDIA-Synapse: REJECTED - Invalid request format');
    console.error('IDIA-Synapse: Expected format: {"raw_data_id": "uuid", "orchestration_mode": true}');
    console.error('IDIA-Synapse: Received format:', JSON.stringify(requestBody, null, 2));
    
    // Log the exact source of this invalid call for debugging
    console.error('IDIA-Synapse: Invalid call source details:');
    console.error('  - User-Agent:', userAgent);
    console.error('  - Referer:', referer);
    console.error('  - X-Forwarded-For:', xForwardedFor);
    console.error('  - Method:', req.method);
    console.error('  - URL:', req.url);
    
    // Check for common invalid call patterns
    if (requestBody.user_id || requestBody.health_data) {
      console.error('IDIA-Synapse: DEPRECATED UI CALL DETECTED - Use health-data-bridge instead');
    } else if (requestBody.recorded_at || requestBody.step_count) {
      console.error('IDIA-Synapse: DIRECT HEALTH DATA CALL DETECTED - This should go through health-data-bridge');
    } else {
      console.error('IDIA-Synapse: UNKNOWN CALL PATTERN - Investigate source');
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid request format. This endpoint only accepts orchestration calls from database triggers.',
      expected: { raw_data_id: 'uuid', orchestration_mode: true },
      received: requestBody,
      message: 'Direct calls must use health-data-bridge endpoint: /functions/v1/health-data-bridge',
      source_info: {
        user_agent: userAgent,
        referer: referer,
        method: req.method
      }
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