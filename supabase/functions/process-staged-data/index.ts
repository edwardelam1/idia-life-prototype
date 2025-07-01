
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

    const { staged_data_id } = await req.json();

    if (!staged_data_id) {
      return new Response('Missing staged_data_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing staged data: ${staged_data_id}`);

    // Call enhanced reward calculation
    const { data: rewardResult, error: rewardError } = await supabase.functions.invoke(
      'calculate-enhanced-rewards',
      {
        body: { staged_data_id }
      }
    );

    if (rewardError) {
      console.error('Reward calculation failed:', rewardError);
      return new Response('Reward calculation failed', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Get the updated staged data
    const { data: stagedData, error: fetchError } = await supabase
      .from('staged_data')
      .select('*')
      .eq('id', staged_data_id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch staged data:', fetchError);
      return new Response('Failed to fetch staged data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Credit user wallet using the existing function
    const { error: creditError } = await supabase.functions.invoke(
      'credit-user-wallet',
      {
        body: {
          user_id: stagedData.user_id,
          reward_amount: stagedData.reward_amount,
          staged_data_id: staged_data_id
        }
      }
    );

    if (creditError) {
      console.error('Failed to credit wallet:', creditError);
      return new Response('Failed to credit wallet', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Successfully processed staged data with reward: $${stagedData.reward_amount}`);
    
    return new Response(JSON.stringify({
      success: true,
      reward_amount: stagedData.reward_amount,
      reward_details: rewardResult
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing staged data:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})
