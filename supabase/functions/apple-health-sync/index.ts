import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appleHealthApiKey = Deno.env.get('APPLE_HEALTH_API_KEY');
    
    if (!appleHealthApiKey) {
      return new Response(JSON.stringify({
        error: 'Apple Health API key not configured. Please add APPLE_HEALTH_API_KEY to your Supabase secrets.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { user_id, apple_health_data } = await req.json();

    if (!user_id || !apple_health_data) {
      throw new Error('Missing required fields: user_id and apple_health_data');
    }

    console.log('Processing Apple Health data for user:', user_id);

    // Update user connection status
    await supabase
      .from('user_connections')
      .upsert({
        user_id: user_id,
        provider: 'apple_health',
        connection_status: 'connected',
        connection_data: apple_health_data,
        last_sync_at: new Date().toISOString()
      });

    // Process different types of health data
    const processedData = [];

    // Process steps data
    if (apple_health_data.steps) {
      const stepsData = {
        user_id: user_id,
        data_source: 'apple_health',
        data_type: 'steps',
        raw_data: {
          steps: apple_health_data.steps,
          recorded_at: apple_health_data.date || new Date().toISOString(),
          device: 'iPhone',
          source: 'Apple Health'
        },
        recorded_at: apple_health_data.date || new Date().toISOString()
      };

      const { data: rawData, error: rawError } = await supabase
        .from('raw_health_data')
        .insert(stepsData)
        .select('id')
        .single();

      if (!rawError) {
        processedData.push({ type: 'steps', id: rawData.id });
      }
    }

    // Process heart rate data
    if (apple_health_data.heartRate) {
      const heartRateData = {
        user_id: user_id,
        data_source: 'apple_health',
        data_type: 'heart_rate',
        raw_data: {
          heart_rate: apple_health_data.heartRate,
          recorded_at: apple_health_data.date || new Date().toISOString(),
          device: 'Apple Watch',
          source: 'Apple Health'
        },
        recorded_at: apple_health_data.date || new Date().toISOString()
      };

      const { data: rawData, error: rawError } = await supabase
        .from('raw_health_data')
        .insert(heartRateData)
        .select('id')
        .single();

      if (!rawError) {
        processedData.push({ type: 'heart_rate', id: rawData.id });
      }
    }

    // Process sleep data
    if (apple_health_data.sleep) {
      const sleepData = {
        user_id: user_id,
        data_source: 'apple_health',
        data_type: 'sleep',
        raw_data: {
          sleep_duration: apple_health_data.sleep.duration,
          sleep_quality: apple_health_data.sleep.quality,
          recorded_at: apple_health_data.date || new Date().toISOString(),
          device: 'iPhone',
          source: 'Apple Health'
        },
        recorded_at: apple_health_data.date || new Date().toISOString()
      };

      const { data: rawData, error: rawError } = await supabase
        .from('raw_health_data')
        .insert(sleepData)
        .select('id')
        .single();

      if (!rawError) {
        processedData.push({ type: 'sleep', id: rawData.id });
      }
    }

    console.log('Successfully processed Apple Health data:', processedData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Apple Health data synced successfully',
      processed_data: processedData,
      sync_timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Apple Health Sync Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});