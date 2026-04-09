
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${supabaseKey}` }
      }
    });

    const { user_id, reward_amount, staged_data_id } = await req.json();

    if (!user_id || !reward_amount || !staged_data_id) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing wallet credit: ${reward_amount} IDIA-BETA for user ${user_id}`);

    // Try to get existing wallet
    const { data: wallet, error: walletFetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    let newBalance: number;

    if (!wallet) {
      // Create wallet if it doesn't exist
      console.log(`No wallet found for user ${user_id}, creating one...`);
      newBalance = parseFloat(reward_amount);
      
      const { error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: user_id,
          idia_beta_balance: newBalance,
          cash_balance: 0,
          idia_token_balance: 0,
          wallet_address: `idia_${user_id.replace(/-/g, '').substring(0, 16)}`
        });

      if (createError) {
        console.error('Failed to create wallet:', createError);
        return new Response('Failed to create wallet', { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    } else {
      // Update existing wallet balance
      newBalance = parseFloat(wallet.idia_beta_balance || 0) + parseFloat(reward_amount);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          idia_beta_balance: newBalance,
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
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user_id,
        transaction_type: 'earn',
        amount: parseFloat(reward_amount),
        description: 'Health data contribution reward',
        source: 'staged_data_reward'
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError);
    }

    console.log(`Successfully credited ${reward_amount} IDIA-BETA to user ${user_id}. New balance: ${newBalance}`);

    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      reward_amount: reward_amount,
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
