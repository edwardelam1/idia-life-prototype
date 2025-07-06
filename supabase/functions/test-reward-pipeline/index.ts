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

    console.log(`Testing reward pipeline for user: ${user_id}`);

    // Step 1: Insert test health metric (this should trigger the entire pipeline)
    const { data: healthMetric, error: healthError } = await supabase
      .from('health_metrics')
      .insert({
        user_id: user_id,
        step_count: 12000, // High step count to trigger good rewards
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (healthError) {
      console.error('Failed to insert health metric:', healthError);
      return new Response('Failed to insert health metric', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Health metric inserted:', healthMetric);

    // Wait a moment for triggers to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Check if staged_health_data was created
    const { data: stagedHealth, error: stagedHealthError } = await supabase
      .from('staged_health_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Latest staged health data:', stagedHealth);

    // Step 3: Check if staged_data was created for rewards
    const { data: stagedData, error: stagedDataError } = await supabase
      .from('staged_data')
      .select('*')
      .eq('user_id', user_id)
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Latest staged data for rewards:', stagedData);

    // Step 4: Check user wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    console.log('User wallet:', wallet);

    // Step 5: Check transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Recent transactions:', transactions);

    return new Response(JSON.stringify({
      success: true,
      test_results: {
        health_metric_created: !!healthMetric,
        staged_health_data_created: !!stagedHealth,
        staged_data_created: !!stagedData,
        wallet_exists: !!wallet,
        wallet_balance: wallet?.idia_usd_balance || 0,
        total_earned: wallet?.total_earned || 0,
        transaction_count: transactions?.length || 0,
        latest_transaction: transactions?.[0] || null
      },
      pipeline_status: {
        health_metrics: 'OK',
        staged_health_data: stagedHealth ? 'OK' : 'FAILED',
        staged_data: stagedData ? 'OK' : 'FAILED', 
        rewards_calculated: stagedData?.reward_calculated || false,
        wallet_credited: (transactions?.length || 0) > 0 ? 'OK' : 'FAILED'
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing reward pipeline:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})