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
      .rpc('generate_pseudonym', { input_text: raw_data_id });
    
    const pseudonym = pseudoResult || `ANON_${Date.now()}`;

    // Step 1: Create anonymized entry in staged_health_data
    const locationZone = await generateLocationZone(supabase);
    
    console.log(`Anonymization-processor: Using pseudonym: ${pseudonym}`);
    console.log(`Anonymization-processor: Generated location zone: ${locationZone}`);

    const { data: stagedHealthData, error: healthError } = await supabase
      .from('staged_health_data')
      .insert({
        raw_data_id: raw_data_id,
        pseudo_user_id: pseudonym,
        activity_type: 'health_metrics',
        steps_count: step_count,
        anonymized_location_zone: locationZone,
        data_quality_score: step_count ? 0.8 : 0.5,
        processed_at: new Date().toISOString()
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
          activity_type: 'health_metrics',
          anonymized_location_zone: locationZone,
          processed_at: new Date().toISOString()
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
        
        // Trigger the reward calculation pipeline
        console.log('Triggering reward calculation for staged_data_id:', stagedData.id);
        try {
          const { data: processResult, error: processError } = await supabase.functions.invoke(
            'process-staged-data',
            {
              body: { staged_data_id: stagedData.id }
            }
          );
          
          if (processError) {
            console.error('Failed to process staged data for rewards:', processError);
          } else {
            console.log('Reward processing completed:', processResult);
          }
        } catch (processErr) {
          console.error('Error calling process-staged-data:', processErr);
        }
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
    // Use default coordinates if no location data is available
    const { data: locationResult, error } = await supabase
      .rpc('anonymize_location', { lat: 0, lng: 0 });
    
    return locationResult || 'ZONE_DEFAULT';
  } catch (error) {
    console.error('Error generating location zone:', error);
    return 'ZONE_DEFAULT';
  }
}