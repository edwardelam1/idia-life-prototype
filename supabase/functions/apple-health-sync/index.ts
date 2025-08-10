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
    // Get Apple JWT credentials for verification
    const appleTeamId = Deno.env.get('APPLE_TEAM_ID');
    const appleKeyId = Deno.env.get('APPLE_KEY_ID');
    const applePrivateKey = Deno.env.get('APPLE_PRIVATE_KEY');
    
    if (!appleTeamId || !appleKeyId || !applePrivateKey) {
      return new Response(JSON.stringify({
        error: 'Apple credentials not configured. Please add APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY to your Supabase secrets.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT token from iOS app (optional - implement based on your security requirements)
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // Add JWT verification logic here if needed for additional security
      console.log('Received JWT token for verification:', token.substring(0, 20) + '...');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestBody = await req.json();
    const { user_id, apple_health_data, automated_sync, connection_id } = requestBody;
    
    // Handle automated sync for all active connections
    if (automated_sync) {
      console.log('Live-only policy active: skipping simulated Apple Health data generation.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Live-only policy enforced. Automated sync will not generate simulated Apple Health data. Real data must be pushed from devices or via user-initiated sync.',
          policy: 'no-simulated-data'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!user_id || !apple_health_data) {
      throw new Error('Missing required fields: user_id and apple_health_data');
    }

    console.log('Processing Apple Health data for user:', user_id);
    console.log('Apple Health data structure received:', Object.keys(apple_health_data));
    console.log('Detailed data types with counts:');
    
    // Log detailed information about what data was received
    Object.keys(apple_health_data).forEach(key => {
      const data = apple_health_data[key];
      if (Array.isArray(data)) {
        console.log(`  ${key}: ${data.length} records`);
        if (data.length > 0) {
          console.log(`    Sample record structure: ${Object.keys(data[0]).join(', ')}`);
        }
      } else if (data && typeof data === 'object') {
        console.log(`  ${key}: Single object with keys: ${Object.keys(data).join(', ')}`);
      } else {
        console.log(`  ${key}: ${typeof data} - ${data}`);
      }
    });

    // Update user connection status in data_connections table
    await supabase
      .from('data_connections')
      .upsert({
        user_id: user_id,
        connection_type: 'apple_health',
        connection_name: 'Apple Health',
        is_active: true,
        last_sync_at: new Date().toISOString()
      });

    // Process comprehensive Apple HealthKit data
    const processedData = [];

    // Define all supported HealthKit data types
    const healthDataTypes = [
      // Basic Activity Data
      'steps', 'distanceWalkingRunning', 'distanceCycling', 'flightsClimbed',
      'activeEnergyBurned', 'restingEnergyBurned', 'exerciseTime',
      
      // Heart & Vitals
      'heartRate', 'heartRateVariability', 'bloodOxygenSaturation', 
      'bloodPressureSystolic', 'bloodPressureDiastolic', 'respiratoryRate',
      'bodyTemperature', 'electrocardiogram', 'vo2Max',
      
      // Body Measurements
      'height', 'weight', 'bodyMassIndex', 'bodyFatPercentage', 
      'leanBodyMass', 'waistCircumference',
      
      // Nutrition
      'dietaryEnergyConsumed', 'totalFat', 'saturatedFat', 'polyunsaturatedFat',
      'monounsaturatedFat', 'carbohydrates', 'fiber', 'sugar', 'protein',
      'water', 'caffeine', 'sodium', 'potassium', 'vitaminC', 'vitaminD',
      'calcium', 'iron',
      
      // Sleep Data
      'sleep', 'timeInBed', 'timeAsleep', 'sleepAnalysis',
      
      // Activity & Mobility
      'walkingSpeed', 'stepLength', 'walkingAsymmetryPercentage',
      'doubleSupportTime',
      
      // Reproductive Health
      'menstrualFlow', 'cervicalMucusQuality', 'ovulationTestResult',
      'sexualActivity', 'basalBodyTemperature',
      
      // Mindfulness & Mental Health
      'mindfulSession', 'moodScore', 'stateOfMind',
      
      // Symptoms
      'symptoms',
      
      // Clinical Records
      'clinicalRecords', 'allergies', 'conditions', 'immunizations',
      'labResults', 'medications', 'procedures',
      
      // Medication Tracking
      'medicationDoseEvents'
    ];

    console.log('Processing comprehensive Apple HealthKit data...');
    
    // Process each data type
    for (const dataType of healthDataTypes) {
      if (apple_health_data[dataType]) {
        try {
          console.log(`Processing ${dataType} data`);
          
          // Handle both single objects and arrays
          const dataArray = Array.isArray(apple_health_data[dataType]) 
            ? apple_health_data[dataType] 
            : [apple_health_data[dataType]];
          
          for (const record of dataArray) {
            const healthRecord = {
              user_id: user_id,
              device_type: 'Apple Health',
              raw_payload: {
                dataType: dataType,
                value: record.value || record,
                unit: record.unit || null,
                startDate: record.startDate || record.date,
                endDate: record.endDate || record.date,
                sourceBundle: record.sourceBundle || 'com.apple.health',
                sourceName: record.sourceName || 'Apple Health',
                metadata: record.metadata || {},
                // Include original record for full data preservation
                originalRecord: record
              },
              recorded_at: record.startDate || record.date || new Date().toISOString(),
              processed: false
            };

            // Add step count for steps data type
            if (dataType === 'steps' && record.value) {
              healthRecord.step_count = parseInt(record.value);
            }

            const { data: rawData, error: rawError } = await supabase
              .from('raw_health_data')
              .insert(healthRecord)
              .select('id')
              .single();

            if (!rawError && rawData) {
              processedData.push({ 
                type: dataType, 
                id: rawData.id,
                value: record.value,
                recordedAt: record.startDate || record.date 
              });
            } else {
              console.error(`Error inserting ${dataType} data:`, rawError);
            }
          }
        } catch (error) {
          console.error(`Error processing ${dataType}:`, error);
          // Continue processing other data types
        }
      }
    }

    // Process workout data separately (complex structure)
    if (apple_health_data.workouts && Array.isArray(apple_health_data.workouts)) {
      console.log(`Processing ${apple_health_data.workouts.length} workout records`);
      
      for (const workout of apple_health_data.workouts) {
        try {
          const workoutRecord = {
            user_id: user_id,
            device_type: 'Apple Health',
            raw_payload: {
              dataType: 'workout',
              workoutActivityType: workout.workoutActivityType,
              duration: workout.duration,
              totalEnergyBurned: workout.totalEnergyBurned,
              totalDistance: workout.totalDistance,
              startDate: workout.startDate,
              endDate: workout.endDate,
              sourceBundle: workout.sourceBundle || 'com.apple.health',
              heartRateSamples: workout.heartRateSamples || [],
              route: workout.route || null,
              metadata: workout.metadata || {},
              originalRecord: workout
            },
            recorded_at: workout.startDate,
            processed: false
          };

          const { data: rawData, error: rawError } = await supabase
            .from('raw_health_data')
            .insert(workoutRecord)
            .select('id')
            .single();

          if (!rawError && rawData) {
            processedData.push({ 
              type: 'workout', 
              id: rawData.id,
              activityType: workout.workoutActivityType,
              duration: workout.duration 
            });
          }
        } catch (error) {
          console.error('Error processing workout:', error);
        }
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