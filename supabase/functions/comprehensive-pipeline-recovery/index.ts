
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
    console.log('Comprehensive Pipeline Recovery: Starting full system recovery...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting recovery for user: ${user_id}`);

    // Phase 1: Comprehensive Diagnostics
    console.log('Phase 1: Running comprehensive diagnostics...');

    // Check pipeline health
    const { data: pipelineHealth, error: healthError } = await supabase
      .rpc('check_pipeline_health');

    if (healthError) {
      console.error('Pipeline health check failed:', healthError);
    }

    // Check user's data connections
    const { data: connections, error: connectionsError } = await supabase
      .from('data_connections')
      .select('*')
      .eq('user_id', user_id);

    // Check recent raw health data
    const { data: recentRawData, error: rawDataError } = await supabase
      .from('raw_health_data')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Check user wallet status
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check recent transactions
    const { data: recentTransactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Diagnostics completed. Results:', {
      pipelineHealth: pipelineHealth?.[0] || 'No data',
      connectionsCount: connections?.length || 0,
      recentDataCount: recentRawData?.length || 0,
      walletStatus: wallet ? 'Found' : 'Missing',
      recentTransactionsCount: recentTransactions?.length || 0
    });

    // Phase 2: Recovery Actions
    console.log('Phase 2: Executing recovery actions...');

    const recoveryResults = {
      connectionFixed: false,
      dataProcessed: 0,
      walletCreated: false,
      syncTriggered: false,
      errors: []
    };

    // Fix Apple Health connection if inactive
    if (connections && connections.length > 0) {
      const appleConnection = connections.find(c => c.connection_type === 'apple_health');
      if (appleConnection && !appleConnection.is_active) {
        const { error: updateError } = await supabase
          .from('data_connections')
          .update({ 
            is_active: true, 
            last_sync_at: new Date().toISOString() 
          })
          .eq('id', appleConnection.id);

        if (!updateError) {
          recoveryResults.connectionFixed = true;
          console.log('Apple Health connection reactivated');
        } else {
          recoveryResults.errors.push('Failed to reactivate Apple Health connection');
        }
      }
    }

    // Create wallet if missing
    if (!wallet) {
      const { error: walletCreateError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: user_id,
          idia_usd_balance: 0,
          total_earned: 0
        });

      if (!walletCreateError) {
        recoveryResults.walletCreated = true;
        console.log('User wallet created');
      } else {
        recoveryResults.errors.push('Failed to create user wallet');
      }
    }

    // Process stuck raw data
    if (recentRawData && recentRawData.length > 0) {
      for (const data of recentRawData.filter(d => !d.processed)) {
        try {
          // Trigger IDIA-Synapse for unprocessed data
          const { error: synapseError } = await supabase.functions.invoke('idia-synapse', {
            body: {
              raw_data_id: data.id,
              orchestration_mode: true
            }
          });

          if (!synapseError) {
            recoveryResults.dataProcessed++;
          }
        } catch (error) {
          console.error(`Failed to process data ${data.id}:`, error);
          recoveryResults.errors.push(`Failed to process data ${data.id}`);
        }
      }
    }

    // Phase 3: Force Fresh Data Sync
    console.log('Phase 3: Triggering fresh data sync...');

    // Create test health data to verify pipeline
    const testHealthData = {
      user_id: user_id,
      device_type: 'Recovery Test',
      raw_payload: {
        steps: 8000,
        heart_rate: 75,
        recorded_at: new Date().toISOString(),
        source: 'pipeline_recovery',
        test_data: true
      },
      step_count: 8000,
      recorded_at: new Date().toISOString(),
      processed: false
    };

    const { data: testData, error: testError } = await supabase
      .from('raw_health_data')
      .insert(testHealthData)
      .select('id')
      .single();

    if (!testError && testData) {
      recoveryResults.syncTriggered = true;
      console.log('Test data inserted, pipeline should trigger automatically');
    } else {
      recoveryResults.errors.push('Failed to trigger test sync');
    }

    // Phase 4: Run Pipeline Recovery
    console.log('Phase 4: Running general pipeline recovery...');

    try {
      const { data: pipelineRecovery, error: recoveryError } = await supabase.functions.invoke('pipeline-recovery', {
        body: { force_reset: true, timeout_minutes: 1 }
      });

      if (!recoveryError) {
        console.log('Pipeline recovery completed:', pipelineRecovery);
      }
    } catch (error) {
      console.warn('Pipeline recovery function not available or failed:', error);
    }

    console.log('Comprehensive recovery completed');

    return new Response(JSON.stringify({
      success: true,
      message: 'Comprehensive pipeline recovery completed',
      diagnostics: {
        pipeline_health: pipelineHealth?.[0] || {},
        connections_count: connections?.length || 0,
        recent_data_count: recentRawData?.length || 0,
        wallet_exists: !!wallet,
        recent_transactions_count: recentTransactions?.length || 0
      },
      recovery_results: recoveryResults,
      recommendations: [
        'Your Apple Health connection has been checked and reactivated if needed',
        'Unprocessed health data has been queued for processing',
        'Test data has been inserted to verify pipeline functionality',
        'Check your earnings in the next few minutes for updates',
        'If issues persist, the data sources may need to be reconnected manually'
      ],
      timestamp: new Date().toISOString()
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Comprehensive Pipeline Recovery: Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error during recovery',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
