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

    // Get the most recent staged_data record
    const { data: stagedData, error: fetchError } = await supabase
      .from('staged_data')
      .select('*')
      .eq('reward_calculated', false)
      .order('processed_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !stagedData) {
      return new Response(JSON.stringify({
        error: 'No unrewarded staged data found',
        details: fetchError
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Testing reward pipeline for staged_data_id: ${stagedData.id}`);

    // Test the process-staged-data function
    const { data: processResult, error: processError } = await supabase.functions.invoke(
      'process-staged-data',
      {
        body: { staged_data_id: stagedData.id }
      }
    );

    if (processError) {
      console.error('Process staged data failed:', processError);
      return new Response(JSON.stringify({
        error: 'Process staged data failed',
        details: processError,
        staged_data: stagedData
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check the result
    const { data: updatedData, error: checkError } = await supabase
      .from('staged_data')
      .select('*')
      .eq('id', stagedData.id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      message: 'Reward pipeline test completed',
      original_data: stagedData,
      updated_data: updatedData,
      process_result: processResult
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing reward pipeline:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})