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
    console.log('Health-Data-Bridge: Request received at', new Date().toISOString());
    console.log('Health-Data-Bridge: Request method:', req.method);
    console.log('Health-Data-Bridge: Request URL:', req.url);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Health-Data-Bridge: Missing environment variables');
      console.error('Health-Data-Bridge: SUPABASE_URL present:', !!supabaseUrl);
      console.error('Health-Data-Bridge: SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseKey);
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Health-Data-Bridge: Creating Supabase client with URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Health-Data-Bridge: Request body parsed successfully');
    } catch (parseError) {
      console.error('Health-Data-Bridge: Failed to parse request body:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: parseError.message
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Health-Data-Bridge: Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { user_id, health_data } = requestBody;

    console.log('Health-Data-Bridge: Extracted fields - user_id:', user_id, 'health_data present:', !!health_data);

    if (!user_id || !health_data) {
      console.error('Health-Data-Bridge: Missing required fields');
      console.error('Health-Data-Bridge: user_id present:', !!user_id);
      console.error('Health-Data-Bridge: health_data present:', !!health_data);
      return new Response(JSON.stringify({
        error: 'Missing required fields: user_id and health_data'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Health-Data-Bridge: Processing health data for user: ${user_id}`);
    console.log('Health-Data-Bridge: Raw health data received:', JSON.stringify(health_data, null, 2));

    // Prepare the insert data for raw_health_data schema
    const insertData = {
      user_id: user_id,
      device_type: health_data.device_type || 'apple_health',
      raw_payload: health_data,
      step_count: health_data.steps || health_data.step_count || null,
      recorded_at: health_data.recorded_at || new Date().toISOString(),
      processed: false
    };

    console.log('Health-Data-Bridge: Prepared insert data:', JSON.stringify(insertData, null, 2));

    // Insert into raw_health_data table - this will trigger the database trigger
    console.log('Health-Data-Bridge: Attempting insert into raw_health_data table...');
    
    const { data: rawHealthData, error: rawError } = await supabase
      .from('raw_health_data')
      .insert(insertData)
      .select()
      .single();

    if (rawError) {
      console.error('Health-Data-Bridge: Insert failed with error:', rawError);
      console.error('Health-Data-Bridge: Error code:', rawError.code);
      console.error('Health-Data-Bridge: Error message:', rawError.message);
      console.error('Health-Data-Bridge: Error details:', rawError.details);
      console.error('Health-Data-Bridge: Error hint:', rawError.hint);
      return new Response(JSON.stringify({
        error: 'Failed to insert health data',
        details: rawError,
        insertData: insertData
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Health-Data-Bridge: Successfully inserted raw data!');
    console.log('Health-Data-Bridge: Inserted record ID:', rawHealthData.id);
    console.log('Health-Data-Bridge: Inserted record data:', JSON.stringify(rawHealthData, null, 2));
    
    // Add fallback processing to ensure data gets processed even if triggers fail
    try {
      console.log('Health-Data-Bridge: Initiating fallback processing...');
      
      // Small delay to let any triggers fire first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if data is already being processed by trigger
      const { data: currentData, error: checkError } = await supabase
        .from('raw_health_data')
        .select('processed, processing_started_at')
        .eq('id', rawHealthData.id)
        .single();
      
      if (checkError) {
        console.error('Health-Data-Bridge: Error checking processing status:', checkError);
      } else if (!currentData.processed && !currentData.processing_started_at) {
        console.log('Health-Data-Bridge: Data not yet processed by trigger, calling IDIA-Synapse directly...');
        
        // Check if this is Apple Health data and use specialized processor
        const isAppleHealthData = insertData.device_type === 'apple_health' || 
                                 insertData.device_type === 'Apple Health' ||
                                 (health_data.source && health_data.source === 'apple_health');
        
        if (isAppleHealthData) {
          console.log('Health-Data-Bridge: Detected Apple Health data, using comprehensive processor...');
          const { data: processResult, error: processError } = await supabase.functions.invoke('comprehensive-apple-health-processor', {
            body: {
              raw_data_id: rawHealthData.id
            }
          });
          
          if (processError) {
            console.error('Health-Data-Bridge: Error in Apple Health processing:', processError);
          } else {
            console.log('Health-Data-Bridge: Apple Health processing initiated successfully');
          }
        } else {
          // Call IDIA-Synapse orchestrator for other data types
          const { data: processResult, error: processError } = await supabase.functions.invoke('idia-synapse', {
            body: {
              raw_data_id: rawHealthData.id,
              orchestration_mode: true
            }
          });
          
          if (processError) {
            console.error('Health-Data-Bridge: Error in fallback processing:', processError);
          } else {
            console.log('Health-Data-Bridge: Fallback processing initiated successfully');
          }
        }
        
        if (processError) {
          console.error('Health-Data-Bridge: Error in fallback processing:', processError);
        } else {
          console.log('Health-Data-Bridge: Fallback processing initiated successfully');
        }
      } else {
        console.log('Health-Data-Bridge: Data already being processed by trigger, skipping fallback');
      }
    } catch (processingError) {
      console.error('Health-Data-Bridge: Exception during fallback processing:', processingError);
      // Continue even if processing fails - data is still ingested
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Health data ingested and processing initiated',
      raw_data_id: rawHealthData.id,
      user_id: user_id,
      processed_at: new Date().toISOString()
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health-Data-Bridge: Unexpected error occurred:', error);
    console.error('Health-Data-Bridge: Error name:', error.name);
    console.error('Health-Data-Bridge: Error message:', error.message);
    console.error('Health-Data-Bridge: Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      name: error.name
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})