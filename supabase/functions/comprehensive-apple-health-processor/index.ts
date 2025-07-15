import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Comprehensive Apple Health Processor: Processing raw Apple Health data');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { raw_data_id } = await req.json();
    
    if (!raw_data_id) {
      throw new Error('Missing raw_data_id');
    }

    console.log(`Processing raw data ID: ${raw_data_id}`);
    
    // Get the raw health data
    const { data: rawData, error: rawError } = await supabase
      .from('raw_health_data')
      .select('*')
      .eq('id', raw_data_id)
      .single();

    if (rawError || !rawData) {
      throw new Error(`Failed to fetch raw data: ${rawError?.message}`);
    }

    console.log('Raw data payload structure:', Object.keys(rawData.raw_payload || {}));

    const rawPayload = rawData.raw_payload;
    const dataType = rawPayload.dataType;
    const originalRecord = rawPayload.originalRecord || rawPayload.value || rawPayload;
    
    // Generate pseudonym for anonymization
    const pseudoUserId = await generatePseudonym(rawData.user_id);
    
    // Create comprehensive staged health data record
    const stagedHealthData = {
      pseudo_user_id: pseudoUserId,
      raw_data_id: raw_data_id,
      activity_type: mapActivityType(dataType),
      device_type: rawData.device_type || 'Apple Health',
      processed_at: new Date().toISOString(),
      healthkit_source_bundles: rawPayload.sourceBundle ? [rawPayload.sourceBundle] : null,
      ...mapAppleHealthDataToColumns(dataType, originalRecord, rawPayload)
    };

    // Calculate comprehensive data quality and completeness scores
    stagedHealthData.data_quality_score = calculateComprehensiveDataQuality(stagedHealthData);
    stagedHealthData.data_completeness_score = calculateDataCompleteness(stagedHealthData);

    console.log('Inserting comprehensive staged health data:', Object.keys(stagedHealthData));

    // Insert into staged_health_data
    const { data: stagedData, error: stagedError } = await supabase
      .from('staged_health_data')
      .insert(stagedHealthData)
      .select('id')
      .single();

    if (stagedError) {
      console.error('Error inserting staged data:', stagedError);
      throw new Error(`Failed to insert staged data: ${stagedError.message}`);
    }

    // Mark raw data as processed
    await supabase
      .from('raw_health_data')
      .update({ 
        processed: true, 
        processing_completed_at: new Date().toISOString(),
        processing_status: 'completed'
      })
      .eq('id', raw_data_id);

    console.log(`Successfully processed and staged comprehensive Apple Health data: ${stagedData.id}`);

    return new Response(JSON.stringify({
      success: true,
      staged_data_id: stagedData.id,
      data_type: dataType,
      processing_completed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Comprehensive Apple Health Processor Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

function generatePseudonym(userId: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'IDIA_SALT_2024');
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function mapActivityType(dataType: string): string {
  const activityMap: { [key: string]: string } = {
    'workout': 'workout',
    'steps': 'activity',
    'heartRate': 'vitals',
    'sleep': 'sleep',
    'nutrition': 'nutrition',
    'clinical': 'clinical'
  };
  return activityMap[dataType] || 'health_metric';
}

function mapAppleHealthDataToColumns(dataType: string, record: any, rawPayload: any): any {
  const mapped: any = {};
  
  // Basic activity metrics
  if (dataType === 'steps' && record.value) {
    mapped.steps_count = parseInt(record.value);
  }
  
  if (dataType === 'distanceWalkingRunning' && record.value) {
    mapped.distance_walking_running_meters = parseFloat(record.value);
  }
  
  if (dataType === 'distanceCycling' && record.value) {
    mapped.distance_cycling_meters = parseFloat(record.value);
  }
  
  if (dataType === 'flightsClimbed' && record.value) {
    mapped.flights_climbed = parseInt(record.value);
  }

  // Heart rate and vitals
  if (dataType === 'heartRate' && record.value) {
    mapped.average_heartrate = parseInt(record.value);
    mapped.max_heartrate = parseInt(record.value);
  }
  
  if (dataType === 'heartRateVariability' && record.value) {
    mapped.heart_rate_variability_ms = parseFloat(record.value);
  }
  
  if (dataType === 'bloodOxygenSaturation' && record.value) {
    mapped.blood_oxygen_saturation = parseFloat(record.value);
  }
  
  if (dataType === 'bloodPressureSystolic' && record.value) {
    mapped.systolic_blood_pressure = parseFloat(record.value);
  }
  
  if (dataType === 'bloodPressureDiastolic' && record.value) {
    mapped.diastolic_blood_pressure = parseFloat(record.value);
  }
  
  if (dataType === 'respiratoryRate' && record.value) {
    mapped.respiratory_rate_per_min = parseFloat(record.value);
  }
  
  if (dataType === 'bodyTemperature' && record.value) {
    mapped.body_temperature_celsius = parseFloat(record.value);
  }
  
  if (dataType === 'vo2Max' && record.value) {
    mapped.vo2_max = parseFloat(record.value);
  }

  // Body measurements
  if (dataType === 'height' && record.value) {
    mapped.height_cm = parseFloat(record.value);
  }
  
  if (dataType === 'weight' && record.value) {
    mapped.weight_kg = parseFloat(record.value);
  }
  
  if (dataType === 'bodyMassIndex' && record.value) {
    mapped.body_mass_index = parseFloat(record.value);
  }
  
  if (dataType === 'bodyFatPercentage' && record.value) {
    mapped.body_fat_percentage = parseFloat(record.value);
  }
  
  if (dataType === 'leanBodyMass' && record.value) {
    mapped.lean_body_mass_kg = parseFloat(record.value);
  }
  
  if (dataType === 'waistCircumference' && record.value) {
    mapped.waist_circumference_cm = parseFloat(record.value);
  }

  // Movement and mobility
  if (dataType === 'walkingSpeed' && record.value) {
    mapped.walking_speed_mps = parseFloat(record.value);
  }
  
  if (dataType === 'stepLength' && record.value) {
    mapped.step_length_cm = parseFloat(record.value);
  }
  
  if (dataType === 'walkingAsymmetryPercentage' && record.value) {
    mapped.walking_asymmetry_percentage = parseFloat(record.value);
  }
  
  if (dataType === 'doubleSupportTime' && record.value) {
    mapped.double_support_time_percentage = parseFloat(record.value);
  }

  // Nutrition
  if (dataType === 'dietaryEnergyConsumed' && record.value) {
    mapped.dietary_energy_kcal = parseFloat(record.value);
  }
  
  if (dataType === 'totalFat' && record.value) {
    mapped.total_fat_g = parseFloat(record.value);
  }
  
  if (dataType === 'saturatedFat' && record.value) {
    mapped.saturated_fat_g = parseFloat(record.value);
  }
  
  if (dataType === 'polyunsaturatedFat' && record.value) {
    mapped.polyunsaturated_fat_g = parseFloat(record.value);
  }
  
  if (dataType === 'monounsaturatedFat' && record.value) {
    mapped.monounsaturated_fat_g = parseFloat(record.value);
  }
  
  if (dataType === 'carbohydrates' && record.value) {
    mapped.carbohydrates_g = parseFloat(record.value);
  }
  
  if (dataType === 'fiber' && record.value) {
    mapped.fiber_g = parseFloat(record.value);
  }
  
  if (dataType === 'sugar' && record.value) {
    mapped.sugar_g = parseFloat(record.value);
  }
  
  if (dataType === 'protein' && record.value) {
    mapped.protein_g = parseFloat(record.value);
  }
  
  if (dataType === 'water' && record.value) {
    mapped.water_ml = parseFloat(record.value);
  }
  
  if (dataType === 'caffeine' && record.value) {
    mapped.caffeine_mg = parseFloat(record.value);
  }
  
  if (dataType === 'sodium' && record.value) {
    mapped.sodium_mg = parseFloat(record.value);
  }
  
  if (dataType === 'potassium' && record.value) {
    mapped.potassium_mg = parseFloat(record.value);
  }
  
  if (dataType === 'vitaminC' && record.value) {
    mapped.vitamin_c_mg = parseFloat(record.value);
  }
  
  if (dataType === 'vitaminD' && record.value) {
    mapped.vitamin_d_mcg = parseFloat(record.value);
  }
  
  if (dataType === 'calcium' && record.value) {
    mapped.calcium_mg = parseFloat(record.value);
  }
  
  if (dataType === 'iron' && record.value) {
    mapped.iron_mg = parseFloat(record.value);
  }

  // Sleep data
  if (dataType === 'sleep' || dataType === 'sleepAnalysis') {
    if (record.sleepStages) {
      mapped.time_in_bed_minutes = record.timeInBed;
      mapped.time_asleep_minutes = record.timeAsleep;
      mapped.awake_duration_minutes = record.awakeTime;
      mapped.rem_duration_minutes = record.remSleep;
      mapped.core_sleep_duration_minutes = record.coreSleep;
      mapped.deep_sleep_duration_minutes = record.deepSleep;
      mapped.sleep_quality_score = record.sleepQuality;
    } else if (record.value) {
      mapped.sleep_duration = parseInt(record.value);
    }
  }
  
  if (dataType === 'timeInBed' && record.value) {
    mapped.time_in_bed_minutes = parseInt(record.value);
  }
  
  if (dataType === 'timeAsleep' && record.value) {
    mapped.time_asleep_minutes = parseInt(record.value);
  }

  // Reproductive health
  if (dataType === 'menstrualFlow' && record.value) {
    mapped.menstrual_flow = record.value.toString();
  }
  
  if (dataType === 'cervicalMucusQuality' && record.value) {
    mapped.cervical_mucus_quality = record.value.toString();
  }
  
  if (dataType === 'ovulationTestResult' && record.value) {
    mapped.ovulation_test_result = record.value.toString();
  }
  
  if (dataType === 'sexualActivity' && record.value) {
    mapped.sexual_activity = !!record.value;
  }
  
  if (dataType === 'basalBodyTemperature' && record.value) {
    mapped.basal_body_temperature_celsius = parseFloat(record.value);
  }

  // Mental health and mindfulness
  if (dataType === 'mindfulSession' && record.value) {
    mapped.mindful_minutes = parseInt(record.value);
  }
  
  if (dataType === 'moodScore' && record.value) {
    mapped.mood_score = parseInt(record.value);
  }
  
  if (dataType === 'stateOfMind' && record.value) {
    mapped.emotional_state = record.value.toString();
  }

  // Clinical data
  if (dataType === 'symptoms' && record.value) {
    mapped.symptoms_logged = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'allergies' && record.value) {
    mapped.clinical_allergies = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'conditions' && record.value) {
    mapped.clinical_conditions = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'immunizations' && record.value) {
    mapped.clinical_immunizations = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'labResults' && record.value) {
    mapped.clinical_lab_results = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'medications' && record.value) {
    mapped.clinical_medications = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'procedures' && record.value) {
    mapped.clinical_procedures = Array.isArray(record.value) ? record.value : [record.value];
  }
  
  if (dataType === 'medicationDoseEvents' && record.value) {
    mapped.medication_doses = Array.isArray(record.value) ? record.value : [record.value];
  }

  // Workout data
  if (dataType === 'workout') {
    mapped.duration_seconds = record.duration ? parseInt(record.duration) : null;
    mapped.calories_burned = record.totalEnergyBurned ? parseInt(record.totalEnergyBurned) : null;
    mapped.distance_meters = record.totalDistance ? parseFloat(record.totalDistance) : null;
    mapped.workout_intensity = record.intensity || null;
    
    if (record.heartRateSamples && record.heartRateSamples.length > 0) {
      const heartRates = record.heartRateSamples.map((hr: any) => parseInt(hr.value)).filter((hr: number) => !isNaN(hr));
      if (heartRates.length > 0) {
        mapped.average_heartrate = Math.round(heartRates.reduce((a: number, b: number) => a + b, 0) / heartRates.length);
        mapped.max_heartrate = Math.max(...heartRates);
      }
    }
  }

  return mapped;
}

function calculateComprehensiveDataQuality(data: any): number {
  let score = 0.3; // Base score
  let dataPoints = 0;
  
  // Basic metrics
  if (data.steps_count) { score += 0.05; dataPoints++; }
  if (data.average_heartrate) { score += 0.1; dataPoints++; }
  if (data.distance_meters || data.distance_walking_running_meters) { score += 0.05; dataPoints++; }
  if (data.calories_burned) { score += 0.05; dataPoints++; }
  
  // Advanced vitals
  if (data.heart_rate_variability_ms) { score += 0.1; dataPoints++; }
  if (data.blood_oxygen_saturation) { score += 0.1; dataPoints++; }
  if (data.systolic_blood_pressure && data.diastolic_blood_pressure) { score += 0.15; dataPoints++; }
  if (data.vo2_max) { score += 0.1; dataPoints++; }
  
  // Sleep data
  if (data.sleep_duration || data.time_asleep_minutes) { score += 0.1; dataPoints++; }
  if (data.rem_duration_minutes && data.deep_sleep_duration_minutes) { score += 0.1; dataPoints++; }
  
  // Nutrition data
  if (data.dietary_energy_kcal) { score += 0.05; dataPoints++; }
  if (data.protein_g && data.carbohydrates_g) { score += 0.05; dataPoints++; }
  if (data.water_ml) { score += 0.03; dataPoints++; }
  
  // Clinical data bonus
  if (data.clinical_medications || data.clinical_conditions) { score += 0.15; dataPoints++; }
  if (data.clinical_lab_results) { score += 0.1; dataPoints++; }
  
  // Cap at 1.0
  return Math.min(score, 1.0);
}

function calculateDataCompleteness(data: any): number {
  const totalPossibleFields = 70; // Total number of health data fields
  let filledFields = 0;
  
  // Count non-null, non-undefined fields
  Object.values(data).forEach(value => {
    if (value !== null && value !== undefined && value !== '') {
      filledFields++;
    }
  });
  
  return Math.min(filledFields / totalPossibleFields, 1.0);
}