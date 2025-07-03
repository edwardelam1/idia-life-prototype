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

    console.log(`IDIA-Synapse processing health data for user: ${user_id}`);

    // Insert raw health data into health_metrics table
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
      console.error('Failed to insert health metrics:', healthError);
      return new Response('Failed to insert health metrics', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Trigger anonymization processor for the health data
    const { data: anonResult, error: anonError } = await supabase.functions.invoke(
      'anonymization-processor',
      {
        body: {
          user_id: user_id,
          health_data: {
            ...health_data,
            health_metric_id: healthMetric.id
          }
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

    console.log('IDIA-Synapse successfully processed health data');
    
    return new Response(JSON.stringify({
      success: true,
      health_metric_id: healthMetric.id,
      anonymization_result: anonResult
    }), { 
      status: 200, 
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