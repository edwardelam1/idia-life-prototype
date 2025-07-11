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
    console.log('IDIA-Synapse received request body:', requestBody);
    
    // Handle two different input formats:
    // 1. Manual UI calls: { user_id, health_data: { steps, heartRate, ... } }
    // 2. Database trigger calls: { recorded_at, step_count, user_id }
    
    let user_id, health_data;
    
    if (requestBody.user_id && requestBody.health_data) {
      // Format 1: Manual UI call
      user_id = requestBody.user_id;
      health_data = requestBody.health_data;
      console.log('Processing manual UI call format');
    } else if (requestBody.step_count !== undefined) {
      // Format 2: Database trigger call - transform to expected format
      user_id = requestBody.user_id || null;
      
      // If user_id is missing, try to look it up from health_metrics table
      if (!user_id && requestBody.recorded_at && requestBody.step_count) {
        console.log('Missing user_id, attempting to look up from health_metrics...');
        try {
          const { data: healthRecord, error: lookupError } = await supabase
            .from('health_metrics')
            .select('user_id')
            .eq('step_count', requestBody.step_count)
            .eq('recorded_at', requestBody.recorded_at)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (lookupError) {
            console.error('Error looking up user_id:', lookupError);
          } else if (healthRecord?.user_id) {
            user_id = healthRecord.user_id;
            console.log('Successfully found user_id:', user_id);
          } else {
            console.warn('No matching health record found for lookup');
          }
        } catch (error) {
          console.error('Exception during user_id lookup:', error);
        }
      }
      
      health_data = {
        steps: requestBody.step_count || 0,
        heartRate: 0, // Not available from health_metrics table
        activeMinutes: requestBody.step_count ? Math.round(requestBody.step_count / 120) : 0,
        sleepHours: 0, // Not available from health_metrics table
        calories: requestBody.step_count ? Math.round(requestBody.step_count * 0.04) : 0
      };
      console.log('Processing database trigger format, transformed health_data:', health_data);
    } else {
      console.error('Invalid request format:', requestBody);
      return new Response('Invalid request format - expected either {user_id, health_data} or {step_count, user_id}', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (!user_id || !health_data) {
      console.error('Missing required data after processing:', { 
        user_id: !!user_id, 
        health_data: !!health_data,
        received_user_id: user_id,
        received_health_data: health_data,
        full_body: requestBody
      });
      return new Response('Missing user_id or health_data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`IDIA-Synapse processing health data for user: ${user_id}`, health_data);

    // Insert raw health data into health_metrics table
    const { data: healthMetric, error: healthError } = await supabase
      .from('health_metrics')
      .insert({
        user_id: user_id,
        step_count: health_data.steps || 0,
        recorded_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

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