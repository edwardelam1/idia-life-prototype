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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestBody = await req.json();
    
    console.log('Processing pending events:', JSON.stringify(requestBody, null, 2));
    
    const limit = requestBody.limit || 10;
    
    // Get pending device events
    const { data: pendingEvents, error: fetchError } = await supabase
      .from('device_events')
      .select('*')
      .eq('processing_status', 'pending')
      .limit(limit);

    if (fetchError) {
      console.error('Error fetching pending events:', fetchError);
      return new Response('Failed to fetch pending events', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending events to process',
        events_processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${pendingEvents.length} pending events to process`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each event by calling the universal data processor
    for (const event of pendingEvents) {
      try {
        console.log(`Processing event ${event.id} (${event.data_category}/${event.event_type})`);
        
        const { data: result, error: processError } = await supabase.functions.invoke(
          'universal-data-processor',
          {
            body: {
              event_id: event.id,
              orchestration_mode: true
            }
          }
        );

        if (processError) {
          console.error(`Error processing event ${event.id}:`, processError);
          errorCount++;
        } else {
          console.log(`Successfully processed event ${event.id}:`, result);
          processedCount++;
        }
      } catch (error) {
        console.error(`Exception processing event ${event.id}:`, error);
        errorCount++;
      }
    }

    // Check results
    const { data: stagedCount } = await supabase
      .from('staged_app_data')
      .select('id', { count: 'exact' });

    const { data: bundleCount } = await supabase
      .from('universal_data_bundles')
      .select('id', { count: 'exact' });

    return new Response(JSON.stringify({
      success: true,
      message: 'Event processing completed',
      events_found: pendingEvents.length,
      events_processed: processedCount,
      events_failed: errorCount,
      staged_data_created: stagedCount?.length || 0,
      bundles_created: bundleCount?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Process pending events error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});