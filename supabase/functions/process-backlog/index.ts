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
    console.log('Process-Backlog: Request received at', new Date().toISOString());
    
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

    const { batch_size = 50, force = false } = requestBody;

    console.log(`Process-Backlog: Processing up to ${batch_size} items, force=${force}`);

    // Get unprocessed raw_health_data entries
    const { data: unprocessedData, error: fetchError } = await supabase
      .from('raw_health_data')
      .select('id, user_id, created_at')
      .eq('processed', false)
      .is('processing_started_at', null)
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (fetchError) {
      console.error('Process-Backlog: Error fetching unprocessed data:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch unprocessed data', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!unprocessedData || unprocessedData.length === 0) {
      console.log('Process-Backlog: No unprocessed data found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No backlog to process',
        processed_count: 0,
        error_count: 0
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Process-Backlog: Found ${unprocessedData.length} items to process`);

    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each item
    for (const item of unprocessedData) {
      try {
        console.log(`Process-Backlog: Processing item ${item.id} for user ${item.user_id}`);

        // Mark as processing started
        const { error: updateError } = await supabase
          .from('raw_health_data')
          .update({ processing_started_at: new Date().toISOString() })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Process-Backlog: Error updating processing status for ${item.id}:`, updateError);
          errorCount++;
          results.push({ id: item.id, status: 'error', error: 'Failed to update status' });
          continue;
        }

        // Call IDIA-Synapse orchestrator
        const { data: processResult, error: processError } = await supabase.functions.invoke('idia-synapse', {
          body: {
            raw_data_id: item.id,
            orchestration_mode: true
          }
        });

        if (processError) {
          console.error(`Process-Backlog: Error processing ${item.id}:`, processError);
          errorCount++;
          results.push({ id: item.id, status: 'error', error: processError.message });
        } else {
          console.log(`Process-Backlog: Successfully initiated processing for ${item.id}`);
          processedCount++;
          results.push({ id: item.id, status: 'success' });
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Process-Backlog: Exception processing ${item.id}:`, error);
        errorCount++;
        results.push({ id: item.id, status: 'error', error: error.message });
      }
    }

    console.log(`Process-Backlog: Completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Backlog processing completed`,
      processed_count: processedCount,
      error_count: errorCount,
      batch_size: unprocessedData.length,
      results: results
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Process-Backlog: Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})