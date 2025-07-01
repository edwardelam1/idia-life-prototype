
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

    const { raw_data_id, activity_id } = await req.json();

    // Find the raw data record
    let query = supabase
      .from('raw_strava_data')
      .select('*')
      .eq('processed', false);

    if (raw_data_id) {
      query = query.eq('id', raw_data_id);
    } else if (activity_id) {
      query = query.eq('activity_id', activity_id);
    }

    const { data: rawData, error: fetchError } = await query.single();

    if (fetchError || !rawData) {
      console.error('Raw data not found:', fetchError);
      return new Response('Raw data not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    const activity = rawData.raw_data;
    
    // Enhanced anonymization and extraction
    const anonymizedData = {
      user_id: rawData.user_id,
      raw_data_id: rawData.id,
      activity_type: activity.type || 'Unknown',
      duration_seconds: activity.moving_time || activity.elapsed_time,
      distance_meters: activity.distance,
      elevation_gain_meters: activity.total_elevation_gain,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      average_speed_mps: activity.average_speed,
      max_speed_mps: activity.max_speed,
      effort_score: activity.suffer_score || calculateEffortScore(activity),
      anonymized_location_zone: anonymizeLocation(activity.start_latlng),
      weather_conditions: extractWeatherData(activity),
      device_type: anonymizeDevice(activity.device_name)
    };

    // Insert anonymized data into staged_data table
    const { data: stagedData, error: stageError } = await supabase
      .from('staged_data')
      .insert(anonymizedData)
      .select()
      .single();

    if (stageError) {
      console.error('Failed to stage data:', stageError);
      return new Response('Failed to stage data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Mark raw data as processed
    const { error: updateError } = await supabase
      .from('raw_strava_data')
      .update({ processed: true })
      .eq('id', rawData.id);

    if (updateError) {
      console.error('Failed to mark data as processed:', updateError);
    }

    // Process the staged data with enhanced rewards
    const { error: processError } = await supabase.functions.invoke(
      'process-staged-data',
      {
        body: { staged_data_id: stagedData.id }
      }
    );

    if (processError) {
      console.error('Failed to process staged data:', processError);
    }

    console.log('Data successfully anonymized, staged, and processed');
    
    return new Response(JSON.stringify({
      success: true,
      staged_data_id: stagedData.id,
      anonymized_fields: {
        location_zone: stagedData.anonymized_location_zone,
        device_type: stagedData.device_type,
        activity_type: stagedData.activity_type
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in anonymization:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

// Helper functions for data anonymization
function anonymizeLocation(startLatLng: [number, number] | null): string | null {
  if (!startLatLng || !Array.isArray(startLatLng) || startLatLng.length !== 2) {
    return null;
  }
  
  const [lat, lng] = startLatLng;
  
  // Round to nearest 0.1 degree (~11km resolution) for privacy
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLng = Math.round(lng * 10) / 10;
  
  return `${roundedLat},${roundedLng}`;
}

function extractWeatherData(activity: any): any | null {
  // Extract only non-personal weather data if available
  if (activity.weather) {
    return {
      temperature: activity.weather.temperature,
      humidity: activity.weather.humidity,
      wind_speed: activity.weather.wind_speed,
      conditions: activity.weather.conditions
    };
  }
  return null;
}

function anonymizeDevice(deviceName: string | null): string | null {
  if (!deviceName) return null;
  
  // Generalize device types for privacy
  const deviceLower = deviceName.toLowerCase();
  
  if (deviceLower.includes('garmin')) return 'GPS Watch';
  if (deviceLower.includes('apple') || deviceLower.includes('iphone')) return 'Smartphone';
  if (deviceLower.includes('fitbit')) return 'Fitness Tracker';
  if (deviceLower.includes('wahoo') || deviceLower.includes('polar')) return 'Heart Rate Monitor';
  
  return 'Unknown Device';
}

function calculateEffortScore(activity: any): number | null {
  // Enhanced effort calculation
  if (!activity.moving_time || !activity.distance) return null;
  
  const avgPace = activity.moving_time / (activity.distance / 1000); // minutes per km
  const elevationFactor = (activity.total_elevation_gain || 0) / 100;
  const heartRateFactor = activity.average_heartrate ? activity.average_heartrate / 180 : 0;
  
  return Math.round((avgPace * 0.4) + (elevationFactor * 0.3) + (heartRateFactor * 0.3) * 100);
}
