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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response('Missing user_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Starting end-to-end pipeline test for user: ${user_id}`);

    // Step 1: Insert test health data
    const testHealthData = {
      user_id: user_id,
      device_type: 'TestDevice_E2E',
      raw_payload: {
        test: 'end_to_end_pipeline',
        timestamp: new Date().toISOString(),
        steps: 7500,
        heart_rate: 75,
        distance: 5000
      },
      step_count: 7500,
      recorded_at: new Date().toISOString()
    };

    const { data: rawData, error: insertError } = await supabase
      .from('raw_health_data')
      .insert(testHealthData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert test data:', insertError);
      return new Response('Failed to insert test data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Test data inserted:', rawData.id);

    // Step 2: Wait for processing (triggers should handle this automatically)
    let attempts = 0;
    let processed = false;
    
    while (attempts < 30 && !processed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: checkData } = await supabase
        .from('raw_health_data')
        .select('processed, processing_started_at')
        .eq('id', rawData.id)
        .single();

      if (checkData?.processed) {
        processed = true;
        console.log('Raw data processed successfully');
      }
      
      attempts++;
    }

    if (!processed) {
      return new Response('Pipeline test failed: Raw data not processed within timeout', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Step 3: Check if staged_health_data was created (via raw_data_id linkage)
    const { data: stagedData, error: stagedError } = await supabase
      .from('staged_health_data')
      .select('*')
      .eq('raw_data_id', rawData.id)
      .maybeSingle();

    if (stagedError || !stagedData) {
      return new Response('Pipeline test failed: No staged health data created', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Staged health data created:', stagedData.id);

    // Step 4: Wait for reward processing
    attempts = 0;
    let rewardCalculated = false;
    
    while (attempts < 30 && !rewardCalculated) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: rewardCheck } = await supabase
        .from('staged_health_data')
        .select('reward_calculated, reward_amount')
        .eq('id', stagedData.id)
        .single();

      if (rewardCheck?.reward_calculated) {
        rewardCalculated = true;
        console.log('Reward calculated:', rewardCheck.reward_amount);
      }
      
      attempts++;
    }

    if (!rewardCalculated) {
      return new Response('Pipeline test failed: Reward not calculated within timeout', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Step 5: Check if transaction was created
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Step 6: Check wallet balance update
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    const results = {
      success: true,
      test_data_id: rawData.id,
      staged_data_id: stagedData.id,
      transaction_id: transaction?.id || null,
      reward_amount: stagedData.reward_amount,
      wallet_balance: wallet?.cash_balance || null,
      processing_time: `${attempts} seconds`,
      message: 'End-to-end pipeline test completed successfully'
    };

    console.log('Pipeline test results:', results);

    return new Response(JSON.stringify(results), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Pipeline test error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})