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

    // Generate pseudonym for anonymized data using new function
    const { data: pseudoResult, error: pseudoError } = await supabase
      .rpc('generate_pseudonym');
    
    const pseudonym = pseudoResult || `ANON_${Date.now()}`;

    // Step 1: Create anonymized entry in staged_health_data
    const locationZone = await generateLocationZone(supabase);
    const anonymizedData = {
      pseudonym: pseudonym,
      step_count: step_count,
      recorded_at: recorded_at,
      location_zone: locationZone,
      data_quality_score: step_count ? 0.8 : 0.5,
      anonymized_at: new Date().toISOString()
    };

    const { data: stagedHealthData, error: healthError } = await supabase
      .from('staged_health_data')
      .insert({
        raw_data_id: raw_data_id,
        pseudonym: pseudonym,
        anonymized_data: anonymizedData,
        location_zone: locationZone,
        recorded_at: recorded_at || new Date().toISOString()
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
          data_type: 'steps',
          step_count: step_count || 0,
          recorded_at: recorded_at || new Date().toISOString(),
          processed: false
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
      pseudonym: pseudonym
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
    const { data: locationResult, error } = await supabase
      .rpc('anonymize_location');
    
    return locationResult || 'ZONE_DEFAULT';
  } catch (error) {
    console.error('Error generating location zone:', error);
    return 'ZONE_DEFAULT';
  }
}