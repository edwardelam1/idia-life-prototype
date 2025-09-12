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

    const { raw_data_id, user_id, raw_payload, step_count, recorded_at } = await req.json();

    if (!raw_data_id) {
      return new Response('Missing raw_data_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Anonymization-processor: Processing raw_data_id: ${raw_data_id}`);

    // Generate pseudonym for anonymized data using new function
    const { data: pseudoResult, error: pseudoError } = await supabase
      .rpc('generate_pseudonym', { input_text: raw_data_id });
    
    const pseudonym = pseudoResult || `ANON_${Date.now()}`;

    // Step 1: Create anonymized entry in staged_health_data
    const locationZone = await generateLocationZone(supabase);
    
    console.log(`Anonymization-processor: Using pseudonym: ${pseudonym}`);
    console.log(`Anonymization-processor: Generated location zone: ${locationZone}`);

    // Extract comprehensive health data from raw payload
    const extractHealthData = (payload) => {
      console.log(`Anonymization-processor: Processing payload for dataType: ${payload.dataType}`);
      console.log(`Anonymization-processor: Payload keys: ${Object.keys(payload).join(', ')}`);
      
      const data = {
        raw_data_id: raw_data_id,
        pseudo_user_id: pseudonym,
        activity_type: 'health_metrics',
        anonymized_location_zone: locationZone,
        processed_at: new Date().toISOString(),
        data_quality_score: 0.5
      };

      // Handle comprehensive HealthKit data based on dataType
      const originalRecord = payload.originalRecord || payload;
      const dataType = payload.dataType;
      const value = payload.value;
      const unit = payload.unit;

      console.log(`Anonymization-processor: Processing ${dataType} with value ${value} ${unit || ''}`);

      if (dataType) {
        // Map all comprehensive HealthKit data types
        switch (dataType) {
          // BASIC ACTIVITY DATA
          case 'steps':
            data.steps_count = parseInt(value) || step_count;
            data.activity_type = 'walking';
            break;
          case 'distanceWalkingRunning':
            data.distance_walking_running_meters = parseFloat(value);
            data.activity_type = 'walking';
            break;
          case 'distanceCycling':
            data.distance_cycling_meters = parseFloat(value);
            data.activity_type = 'cycling';
            break;
          case 'flightsClimbed':
            data.flights_climbed = parseInt(value);
            break;
          case 'activeEnergyBurned':
            data.calories_burned = parseFloat(value);
            break;
          case 'restingEnergyBurned':
            data.calories_burned = parseFloat(value);
            break;
          case 'exerciseTime':
            data.duration_seconds = parseFloat(value) * 60; // Convert minutes to seconds
            break;

          // HEART & VITALS
          case 'heartRate':
            data.average_heartrate = parseInt(value);
            break;
          case 'heartRateVariability':
            data.heart_rate_variability_ms = parseFloat(value);
            break;
          case 'bloodOxygenSaturation':
            data.blood_oxygen_saturation = parseFloat(value);
            break;
          case 'bloodPressureSystolic':
            data.systolic_blood_pressure = parseFloat(value);
            break;
          case 'bloodPressureDiastolic':
            data.diastolic_blood_pressure = parseFloat(value);
            break;
          case 'respiratoryRate':
            data.respiratory_rate_per_min = parseFloat(value);
            break;
          case 'bodyTemperature':
            data.body_temperature_celsius = parseFloat(value);
            break;
          case 'electrocardiogram':
            data.ecg_classification = value;
            break;
          case 'vo2Max':
            data.vo2_max = parseFloat(value);
            break;

          // BODY MEASUREMENTS
          case 'height':
            data.height_cm = unit === 'cm' ? parseFloat(value) : parseFloat(value) * 100;
            break;
          case 'weight':
            data.weight_kg = parseFloat(value);
            break;
          case 'bodyMassIndex':
            data.body_mass_index = parseFloat(value);
            break;
          case 'bodyFatPercentage':
            data.body_fat_percentage = parseFloat(value);
            break;
          case 'leanBodyMass':
            data.lean_body_mass_kg = parseFloat(value);
            break;
          case 'waistCircumference':
            data.waist_circumference_cm = parseFloat(value);
            break;

          // NUTRITION
          case 'dietaryEnergyConsumed':
            data.dietary_energy_kcal = parseFloat(value);
            break;
          case 'totalFat':
            data.total_fat_g = parseFloat(value);
            break;
          case 'saturatedFat':
            data.saturated_fat_g = parseFloat(value);
            break;
          case 'polyunsaturatedFat':
            data.polyunsaturated_fat_g = parseFloat(value);
            break;
          case 'monounsaturatedFat':
            data.monounsaturated_fat_g = parseFloat(value);
            break;
          case 'carbohydrates':
            data.carbohydrates_g = parseFloat(value);
            break;
          case 'fiber':
            data.fiber_g = parseFloat(value);
            break;
          case 'sugar':
            data.sugar_g = parseFloat(value);
            break;
          case 'protein':
            data.protein_g = parseFloat(value);
            break;
          case 'water':
            data.water_ml = parseFloat(value);
            break;
          case 'caffeine':
            data.caffeine_mg = parseFloat(value);
            break;
          case 'sodium':
            data.sodium_mg = parseFloat(value);
            break;
          case 'potassium':
            data.potassium_mg = parseFloat(value);
            break;
          case 'vitaminC':
            data.vitamin_c_mg = parseFloat(value);
            break;
          case 'vitaminD':
            data.vitamin_d_mcg = parseFloat(value);
            break;
          case 'calcium':
            data.calcium_mg = parseFloat(value);
            break;
          case 'iron':
            data.iron_mg = parseFloat(value);
            break;

          // SLEEP DATA
          case 'sleep':
          case 'sleepAnalysis':
            data.sleep_duration = parseInt(value);
            data.activity_type = 'sleep';
            break;
          case 'timeInBed':
            data.time_in_bed_minutes = parseInt(value);
            break;
          case 'timeAsleep':
            data.time_asleep_minutes = parseInt(value);
            break;

          // MOBILITY & GAIT
          case 'walkingSpeed':
            data.walking_speed_mps = parseFloat(value);
            break;
          case 'stepLength':
            data.step_length_cm = parseFloat(value);
            break;
          case 'walkingAsymmetryPercentage':
            data.walking_asymmetry_percentage = parseFloat(value);
            break;
          case 'doubleSupportTime':
            data.double_support_time_percentage = parseFloat(value);
            break;

          // REPRODUCTIVE HEALTH
          case 'menstrualFlow':
            data.menstrual_flow = value;
            data.activity_type = 'reproductive_health';
            break;
          case 'cervicalMucusQuality':
            data.cervical_mucus_quality = value;
            break;
          case 'ovulationTestResult':
            data.ovulation_test_result = value;
            break;
          case 'sexualActivity':
            data.sexual_activity = Boolean(value);
            break;
          case 'basalBodyTemperature':
            data.basal_body_temperature_celsius = parseFloat(value);
            break;

          // MINDFULNESS & MENTAL HEALTH
          case 'mindfulSession':
            data.mindful_minutes = parseInt(value);
            data.activity_type = 'mindfulness';
            break;
          case 'moodScore':
          case 'stateOfMind':
            data.mood_score = parseInt(value);
            data.emotional_state = originalRecord.emotionalState;
            break;

          // SYMPTOMS
          case 'symptoms':
            data.symptoms_logged = originalRecord;
            break;

          // CLINICAL RECORDS
          case 'clinicalRecords':
            data.clinical_lab_results = originalRecord;
            break;
          case 'allergies':
            data.clinical_allergies = originalRecord;
            break;
          case 'conditions':
            data.clinical_conditions = originalRecord;
            break;
          case 'immunizations':
            data.clinical_immunizations = originalRecord;
            break;
          case 'labResults':
            data.clinical_lab_results = originalRecord;
            break;
          case 'medications':
            data.clinical_medications = originalRecord;
            break;
          case 'procedures':
            data.clinical_procedures = originalRecord;
            break;

          // MEDICATION TRACKING
          case 'medicationDoseEvents':
            data.medication_doses = originalRecord;
            data.medication_adherence_score = parseFloat(value) || 1.0;
            break;

          // WORKOUTS
          case 'workout':
            data.activity_type = payload.workoutActivityType || 'workout';
            data.duration_seconds = parseInt(payload.duration);
            data.distance_meters = parseFloat(payload.totalDistance);
            data.calories_burned = parseFloat(payload.totalEnergyBurned);
            if (payload.heartRateSamples?.length > 0) {
              const heartRates = payload.heartRateSamples.map(s => s.value);
              data.average_heartrate = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
              data.max_heartrate = Math.max(...heartRates);
            }
            break;

          default:
            console.log(`Anonymization-processor: Unknown dataType: ${dataType}, storing in raw format`);
            // Store unknown data types in clinical_vitals for future processing
            data.clinical_vitals = data.clinical_vitals || {};
            data.clinical_vitals[dataType] = { value, unit, metadata: originalRecord };
        }
      } else {
        // Handle legacy data format
        console.log('Anonymization-processor: Processing legacy data format');
        data.steps_count = step_count;
        data.average_heartrate = payload.heart_rate || payload.averageHeartRate;
        data.duration_seconds = payload.duration || payload.duration_seconds;
        data.distance_meters = payload.distance || payload.distance_meters;
        data.calories_burned = payload.calories || payload.activeEnergyBurned;
      }

      // Calculate comprehensive data quality score
      let qualityScore = 0.3; // Base score
      let dataTypeCount = 0;

      // Basic metrics (20% each)
      if (data.steps_count) { qualityScore += 0.05; dataTypeCount++; }
      if (data.average_heartrate) { qualityScore += 0.05; dataTypeCount++; }
      if (data.calories_burned) { qualityScore += 0.05; dataTypeCount++; }
      if (data.duration_seconds) { qualityScore += 0.05; dataTypeCount++; }

      // Vitals (15% total)
      if (data.heart_rate_variability_ms) { qualityScore += 0.03; dataTypeCount++; }
      if (data.blood_oxygen_saturation) { qualityScore += 0.03; dataTypeCount++; }
      if (data.systolic_blood_pressure) { qualityScore += 0.03; dataTypeCount++; }
      if (data.respiratory_rate_per_min) { qualityScore += 0.03; dataTypeCount++; }
      if (data.body_temperature_celsius) { qualityScore += 0.03; dataTypeCount++; }

      // Body composition (15% total)
      if (data.height_cm && data.weight_kg) { qualityScore += 0.08; dataTypeCount++; }
      if (data.body_mass_index) { qualityScore += 0.03; dataTypeCount++; }
      if (data.body_fat_percentage) { qualityScore += 0.04; dataTypeCount++; }

      // Nutrition (10% total)
      if (data.dietary_energy_kcal) { qualityScore += 0.03; dataTypeCount++; }
      if (data.protein_g || data.carbohydrates_g || data.total_fat_g) { qualityScore += 0.04; dataTypeCount++; }
      if (data.water_ml) { qualityScore += 0.03; dataTypeCount++; }

      // Sleep (10% total)
      if (data.sleep_duration || data.time_asleep_minutes) { qualityScore += 0.05; dataTypeCount++; }
      if (data.time_in_bed_minutes) { qualityScore += 0.05; dataTypeCount++; }

      // Mental health & mindfulness (5% total)
      if (data.mindful_minutes) { qualityScore += 0.03; dataTypeCount++; }
      if (data.mood_score) { qualityScore += 0.02; dataTypeCount++; }

      // Clinical & reproductive health (10% total)
      if (data.clinical_lab_results || data.clinical_medications) { qualityScore += 0.05; dataTypeCount++; }
      if (data.menstrual_flow || data.basal_body_temperature_celsius) { qualityScore += 0.05; dataTypeCount++; }

      // Activity diversity bonus
      if (dataTypeCount >= 5) qualityScore += 0.05;
      if (dataTypeCount >= 10) qualityScore += 0.05;
      if (dataTypeCount >= 15) qualityScore += 0.05;
      
      data.data_quality_score = Math.min(1.0, qualityScore);
      data.data_completeness_score = Math.min(1.0, dataTypeCount / 20); // Out of 20 key metrics

      console.log(`Anonymization-processor: Calculated quality score: ${data.data_quality_score}, completeness: ${data.data_completeness_score}, data types: ${dataTypeCount}`);

      return data;
    };

    const healthData = extractHealthData(raw_payload);
    
    const { data: stagedHealthData, error: healthError } = await supabase
      .from('staged_health_data')
      .insert(healthData)
      .select()
      .single();

    if (healthError) {
      console.error('Failed to create staged_health_data:', healthError);
      return new Response('Failed to create anonymized health data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Staged health data created:', stagedHealthData.id);

    // Step 2: Create entry in staged_data for reward processing (only for authenticated users)
    let stagedDataResult = null;
    if (user_id) {
      // Map health data to staged_data for reward calculation
      const rewardData = {
        user_id: user_id,
        raw_data_id: raw_data_id,
        activity_type: healthData.activity_type || 'health_metrics',
        anonymized_location_zone: locationZone,
        processed_at: new Date().toISOString(),
        // Critical fields for reward calculation
        average_heartrate: healthData.average_heartrate || null,
        duration_seconds: healthData.duration_seconds || null,
        distance_meters: healthData.distance_meters || healthData.distance_walking_running_meters || healthData.distance_cycling_meters || null,
        calories_burned: healthData.calories_burned || null,
        device_type: 'Apple Health',
        // Additional health metrics for enhanced rewards
        elevation_gain_meters: null, // Apple Health doesn't provide this directly
        weather_conditions: null // Will be enriched later if needed
      };

      console.log(`Creating staged_data with: hr=${rewardData.average_heartrate}, duration=${rewardData.duration_seconds}, distance=${rewardData.distance_meters}, calories=${rewardData.calories_burned}`);

      const { data: stagedData, error: stagedError } = await supabase
        .from('staged_data')
        .insert(rewardData)
        .select()
        .single();

      if (stagedError) {
        console.error('Failed to create staged_data:', stagedError);
        // Don't fail the whole process, just log the error
        console.log('Continuing without reward data creation...');
      } else {
        stagedDataResult = stagedData;
        console.log('Staged data for rewards created:', stagedData.id);
        
        // Trigger the reward calculation pipeline
        console.log('Triggering reward calculation for staged_data_id:', stagedData.id);
        try {
          const { data: processResult, error: processError } = await supabase.functions.invoke(
            'process-staged-data',
            {
              body: { staged_data_id: stagedData.id }
            }
          );
          
          if (processError) {
            console.error('Failed to process staged data for rewards:', processError);
          } else {
            console.log('Reward processing completed:', processResult);
          }
        } catch (processErr) {
          console.error('Error calling process-staged-data:', processErr);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Data anonymized and staged successfully',
      staged_health_data_id: stagedHealthData.id,
      staged_data_id: stagedDataResult?.id || null,
      pseudonym: pseudonym
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in anonymization-processor:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

async function generateLocationZone(supabase: any) {
  try {
    // Use default coordinates if no location data is available
    const { data: locationResult, error } = await supabase
      .rpc('anonymize_location', { lat: 0, lng: 0 });
    
    return locationResult || 'ZONE_DEFAULT';
  } catch (error) {
    console.error('Error generating location zone:', error);
    return 'ZONE_DEFAULT';
  }
}