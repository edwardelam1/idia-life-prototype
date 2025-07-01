
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { user_id, initial_balance = 100.00 } = await req.json()

    // Check if wallet exists
    const { data: existingWallet, error: selectError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (selectError && selectError.code === 'PGRST116') {
      // Wallet doesn't exist, create it using service role
      const { data: newWallet, error: insertError } = await supabaseAdmin
        .from('user_wallets')
        .insert({
          user_id: user_id,
          idia_usd_balance: initial_balance,
          total_earned: 0
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          wallet: newWallet,
          balance: newWallet.idia_usd_balance,
          created: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else if (selectError) {
      throw selectError
    }

    // Wallet exists
    return new Response(
      JSON.stringify({ 
        success: true,
        wallet: existingWallet,
        balance: existingWallet.idia_usd_balance,
        created: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to setup test wallet'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
