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

    const { raw_data_id, user_id, raw_payload, step_count, recorded_at } = await req.json();

    if (!raw_data_id) {
      return new Response('Missing raw_data_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Anonymization-processor: Processing raw_data_id: ${raw_data_id}`);

    // Generate pseudonym for anonymized data
    const { data: pseudoResult, error: pseudoError } = await supabase
      .rpc('generate_pseudonym', { input_text: user_id || 'anonymous' });
    
    const pseudo_id = pseudoResult || `anonymous_${Date.now()}`;

    // Step 1: Create anonymized entry in staged_health_data
    const { data: stagedHealthData, error: healthError } = await supabase
      .from('staged_health_data')
      .insert({
        pseudo_user_id: pseudo_id,
        activity_type: 'Daily Activity',
        steps_count: step_count || 0,
        processed_at: new Date().toISOString(),
        created_at: recorded_at || new Date().toISOString(),
        data_quality_score: step_count ? 0.8 : 0.5,
        workout_intensity: step_count > 10000 ? 75 : step_count > 5000 ? 50 : 25,
        device_type: 'Health App',
        anonymized_location_zone: await generateLocationZone(supabase),
        raw_data_id: raw_data_id
      })
      .select()
      .single();

    if (healthError) {
      console.error('Failed to create staged_health_data:', healthError);
      return new Response('Failed to create anonymized health data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Staged health data created:', stagedHealthData.id);

    // Step 2: Create entry in staged_data for reward processing (only for authenticated users)
    let stagedDataResult = null;
    if (user_id) {
      const { data: stagedData, error: stagedError } = await supabase
        .from('staged_data')
        .insert({
          user_id: user_id,
          raw_data_id: raw_data_id,
          activity_type: 'Health Data',
          duration_seconds: step_count > 10000 ? 3600 : step_count > 5000 ? 1800 : 900,
          average_heartrate: step_count > 8000 ? 75 : step_count > 4000 ? 65 : 55,
          effort_score: step_count > 10000 ? 85 : step_count > 5000 ? 65 : 45,
          device_type: 'Apple Health',
          processed_at: new Date().toISOString(),
          reward_calculated: false
        })
        .select()
        .single();

      if (stagedError) {
        console.error('Failed to create staged_data:', stagedError);
        // Don't fail the whole process, just log the error
        console.log('Continuing without reward data creation...');
      } else {
        stagedDataResult = stagedData;
        console.log('Staged data for rewards created:', stagedData.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Data anonymized and staged successfully',
      staged_health_data_id: stagedHealthData.id,
      staged_data_id: stagedDataResult?.id || null,
      pseudo_user_id: pseudo_id
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in anonymization-processor:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

async function generateLocationZone(supabase: any) {
  try {
    // Generate a randomized location zone using the anonymize_location function
    const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const lng = -74.0060 + (Math.random() - 0.5) * 0.1;
    
    const { data: locationResult, error } = await supabase
      .rpc('anonymize_location', { lat, lng });
    
    return locationResult || 'ZONE_DEFAULT';
  } catch (error) {
    console.error('Error generating location zone:', error);
    return 'ZONE_DEFAULT';
  }
}