
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

    const { user_id, reward_amount, staged_data_id } = await req.json();

    if (!user_id || !reward_amount || !staged_data_id) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing wallet credit: ${reward_amount} IDIA-USD for user ${user_id}`);

    // Begin transaction-like operations
    // Get existing wallet (should exist due to trigger on user creation)
    const { data: wallet, error: walletFetchError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (walletFetchError) {
      console.error('Error fetching wallet:', walletFetchError);
      return new Response('Wallet not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + parseFloat(reward_amount);
    const newTotalEarned = parseFloat(wallet.total_earned) + parseFloat(reward_amount);

    const { error: updateError } = await supabase
      .from('user_wallets')
      .update({
        balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Failed to update wallet:', updateError);
      return new Response('Failed to update wallet', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user_id,
        transaction_type: 'earn',
        amount: parseFloat(reward_amount),
        description: 'Health data contribution reward',
        reference_type: 'reward',
        reference_id: staged_data_id,
        balance_after: newBalance
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError);
      // Don't fail the whole operation for transaction logging
    }

    console.log(`Successfully credited ${reward_amount} IDIA-USD to user ${user_id}`);
    console.log(`New balance: ${newBalance}, Total earned: ${newTotalEarned}`);

    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      reward_amount: reward_amount,
      total_earned: newTotalEarned,
      transaction_id: transaction?.id
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error crediting wallet:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})
