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
    console.log('Pipeline-Recovery: Request received at', new Date().toISOString());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    let requestBody = {};
    try {
      if (req.method === 'POST') {
        requestBody = await req.json();
      }
    } catch (e) {
      // Use defaults if no body provided
    }

    const { timeout_minutes = 30, force_reset = false } = requestBody;

    console.log(`Pipeline-Recovery: Looking for stuck items older than ${timeout_minutes} minutes`);

    // Find items that have been processing for too long
    const timeoutThreshold = new Date(Date.now() - timeout_minutes * 60 * 1000).toISOString();

    const { data: stuckItems, error: fetchError } = await supabase
      .from('raw_health_data')
      .select('id, user_id, processing_started_at, created_at')
      .eq('processed', false)
      .not('processing_started_at', 'is', null)
      .lt('processing_started_at', timeoutThreshold)
      .order('processing_started_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Pipeline-Recovery: Error fetching stuck items:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stuck items', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stuckItems || stuckItems.length === 0) {
      console.log('Pipeline-Recovery: No stuck items found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No stuck items found',
        recovered_count: 0
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Pipeline-Recovery: Found ${stuckItems.length} stuck items to recover`);

    let recoveredCount = 0;
    let errorCount = 0;
    const results = [];

    // Recover each stuck item
    for (const item of stuckItems) {
      try {
        console.log(`Pipeline-Recovery: Recovering item ${item.id} (stuck since ${item.processing_started_at})`);

        if (force_reset) {
          // Reset the processing status completely
          const { error: resetError } = await supabase
            .from('raw_health_data')
            .update({ 
              processing_started_at: null,
              processing_completed_at: null 
            })
            .eq('id', item.id);

          if (resetError) {
            console.error(`Pipeline-Recovery: Error resetting ${item.id}:`, resetError);
            errorCount++;
            results.push({ id: item.id, status: 'error', action: 'reset', error: resetError.message });
            continue;
          }

          // Small delay to let triggers fire
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Call IDIA-Synapse orchestrator to retry processing
        const { data: processResult, error: processError } = await supabase.functions.invoke('idia-synapse', {
          body: {
            raw_data_id: item.id,
            orchestration_mode: true
          }
        });

        if (processError) {
          console.error(`Pipeline-Recovery: Error reprocessing ${item.id}:`, processError);
          errorCount++;
          results.push({ id: item.id, status: 'error', action: 'reprocess', error: processError.message });
        } else {
          console.log(`Pipeline-Recovery: Successfully initiated recovery for ${item.id}`);
          recoveredCount++;
          results.push({ id: item.id, status: 'success', action: force_reset ? 'reset_and_reprocess' : 'reprocess' });
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Pipeline-Recovery: Exception recovering ${item.id}:`, error);
        errorCount++;
        results.push({ id: item.id, status: 'error', action: 'exception', error: error.message });
      }
    }

    console.log(`Pipeline-Recovery: Completed. Recovered: ${recoveredCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Pipeline recovery completed`,
      recovered_count: recoveredCount,
      error_count: errorCount,
      timeout_minutes,
      force_reset,
      results: results
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Pipeline-Recovery: Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})