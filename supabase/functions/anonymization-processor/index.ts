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

    const { user_id, health_data } = await req.json();

    if (!user_id || !health_data) {
      return new Response('Missing user_id or health_data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Anonymization processor starting for user: ${user_id}`);

    // Generate pseudonymized user ID for privacy
    const pseudoUserId = await generatePseudonym(user_id);
    
    // Anonymize and structure health data
    const anonymizedData = {
      pseudo_user_id: pseudoUserId,
      activity_type: 'Health Data',
      steps_count: health_data.steps || 0,
      average_heartrate: health_data.heartRate || null,
      calories_burned: health_data.calories || null,
      sleep_duration: health_data.sleepHours ? parseFloat(health_data.sleepHours) * 3600 : null,
      workout_intensity: health_data.activeMinutes || null,
      device_type: 'Apple Health',
      data_quality_score: calculateDataQuality(health_data),
      anonymized_location_zone: anonymizeLocation(health_data.latitude, health_data.longitude),
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      raw_data_id: health_data.health_metric_id || null
    };

    // Insert into staged_health_data table
    const { data: stagedData, error: stagingError } = await supabase
      .from('staged_health_data')
      .insert(anonymizedData)
      .select()
      .single();

    if (stagingError) {
      console.error('Failed to stage anonymized data:', stagingError);
      return new Response('Failed to stage data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Determine the raw_data_id for staged_data table, ensuring it's a valid UUID
    let rewardRawDataId: string;
    if (health_data.health_metric_id && isValidUUID(health_data.health_metric_id)) {
      rewardRawDataId = health_data.health_metric_id;
    } else {
      rewardRawDataId = crypto.randomUUID(); // Generate new UUID if original is missing or invalid
    }

    // Create corresponding entry in staged_data for reward processing
    const rewardStagedData = {
      user_id: user_id,
      raw_data_id: rewardRawDataId, // Use the validated/generated UUID
      activity_type: 'Health Data',
      duration_seconds: health_data.activeMinutes ? health_data.activeMinutes * 60 : null,
      average_heartrate: health_data.heartRate || null,
      effort_score: calculateEffortScore(health_data),
      device_type: 'Apple Health',
      processed_at: new Date().toISOString()
    };

    const { data: rewardStaged, error: rewardError } = await supabase
      .from('staged_data')
      .insert(rewardStagedData)
      .select()
      .maybeSingle();

    if (rewardError) {
      console.error('Failed to create reward staging:', rewardError);
      // Continue processing even if reward staging fails
    } else {
      // Trigger the reward processing chain
      const { error: processError } = await supabase.functions.invoke(
        'process-staged-data',
        {
          body: { staged_data_id: rewardStaged.id }
        }
      );

      if (processError) {
        console.error('Failed to trigger reward processing:', processError);
      }
    }

    console.log('Anonymization processor completed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      staged_health_data_id: stagedData.id,
      staged_reward_data_id: rewardStaged?.id || null,
      anonymized_user_id: pseudoUserId
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in anonymization processor:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

// Helper function to validate if a string is a valid UUID
function isValidUUID(uuidString: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuidString);
}

// Helper functions
async function generatePseudonym(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'IDIA_SALT_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function anonymizeLocation(lat?: number, lng?: number): string {
  // Use proper location anonymization if coordinates provided
  if (lat && lng) {
    // Round to ~1km precision for privacy while maintaining geographic utility
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLng = Math.round(lng * 100) / 100;
    return `ZONE_${Math.abs(roundedLat).toString().replace('.', '')}_${Math.abs(roundedLng).toString().replace('.', '')}`;
  }
  // If no location data provided, return null to indicate no location
  return null;
}

function calculateDataQuality(healthData: any): number {
  let score = 0.5; // Base score
  
  if (healthData.steps) score += 0.2;
  if (healthData.heartRate) score += 0.2;
  if (healthData.calories) score += 0.1;
  if (healthData.sleepHours) score += 0.1;
  if (healthData.activeMinutes) score += 0.1;
  
  return Math.min(score, 1.0);
}

function calculateEffortScore(healthData: any): number | null {
  if (!healthData.steps && !healthData.activeMinutes) return null;
  
  const stepsFactor = (healthData.steps || 0) / 10000; // Normalize to 10k steps
  const activityFactor = (healthData.activeMinutes || 0) / 60; // Normalize to 60 minutes
  
  return Math.round((stepsFactor * 50) + (activityFactor * 50));
}