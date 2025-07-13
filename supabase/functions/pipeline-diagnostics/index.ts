import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Pipeline-Diagnostics: Request received at', new Date().toISOString());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the diagnostic function
    const { data: healthData, error: healthError } = await supabase
      .rpc('check_pipeline_health');

    if (healthError) {
      console.error('Pipeline-Diagnostics: Error getting health data:', healthError);
      return new Response(
        JSON.stringify({ error: 'Failed to get pipeline health', details: healthError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get additional diagnostics
    const { data: recentRawData, error: recentError } = await supabase
      .from('raw_health_data')
      .select('id, user_id, processed, processing_started_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentStagedData, error: stagedError } = await supabase
      .from('staged_data')
      .select('id, user_id, reward_calculated, processed_at')
      .order('processed_at', { ascending: false })
      .limit(10);

    const { data: recentTransactions, error: transError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, created_at, source')
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate pipeline efficiency
    const totalRaw = healthData[0]?.total_raw_data || 0;
    const unprocessed = healthData[0]?.unprocessed_raw_data || 0;
    const processed = healthData[0]?.processed_raw_data || 0;
    const processingEfficiency = totalRaw > 0 ? (processed / totalRaw) * 100 : 0;

    const totalStaged = healthData[0]?.total_staged_data || 0;
    const unrewarded = healthData[0]?.unrewarded_staged_data || 0;
    const rewardEfficiency = totalStaged > 0 ? ((totalStaged - unrewarded) / totalStaged) * 100 : 0;

    const diagnostics = {
      timestamp: new Date().toISOString(),
      pipeline_health: healthData[0] || {},
      efficiency: {
        processing_efficiency: Math.round(processingEfficiency * 100) / 100,
        reward_efficiency: Math.round(rewardEfficiency * 100) / 100
      },
      status: {
        overall: processingEfficiency > 80 && rewardEfficiency > 80 ? 'healthy' : 
                processingEfficiency > 50 && rewardEfficiency > 50 ? 'warning' : 'critical',
        data_ingestion: totalRaw > 0 ? 'active' : 'inactive',
        data_processing: unprocessed === 0 ? 'current' : unprocessed < 10 ? 'minor_backlog' : 'major_backlog',
        reward_processing: unrewarded === 0 ? 'current' : unrewarded < 10 ? 'minor_backlog' : 'major_backlog'
      },
      recent_activity: {
        raw_data: recentRawData || [],
        staged_data: recentStagedData || [],
        transactions: recentTransactions || []
      },
      recommendations: []
    };

    // Add recommendations based on status
    if (unprocessed > 0) {
      diagnostics.recommendations.push(`${unprocessed} raw health data entries need processing. Consider running backlog processor.`);
    }
    if (unrewarded > 0) {
      diagnostics.recommendations.push(`${unrewarded} staged data entries need reward calculation.`);
    }
    if (processingEfficiency < 80) {
      diagnostics.recommendations.push('Processing efficiency is below optimal. Check IDIA-Synapse function logs.');
    }
    if (rewardEfficiency < 80) {
      diagnostics.recommendations.push('Reward processing efficiency is below optimal. Check process-staged-data function logs.');
    }

    console.log('Pipeline-Diagnostics: Health check completed successfully');

    return new Response(JSON.stringify({
      success: true,
      diagnostics
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Pipeline-Diagnostics: Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})