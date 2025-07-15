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
    console.log('Creating comprehensive HealthKit test data...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('Missing user_id');
    }

    console.log(`Creating comprehensive test data for user: ${user_id}`);
    
    // Create multiple comprehensive HealthKit data samples
    const comprehensiveHealthSamples = [
      // Cardiovascular-focused sample
      {
        user_id,
        device_type: 'Apple Watch Series 9',
        raw_payload: {
          dataType: 'comprehensive_cardiovascular',
          source: 'apple_health',
          cardiovascularData: {
            heartRate: { value: 72, unit: 'bpm', timestamp: new Date().toISOString() },
            heartRateVariability: { value: 45.2, unit: 'ms', timestamp: new Date().toISOString() },
            bloodOxygenSaturation: { value: 98.5, unit: '%', timestamp: new Date().toISOString() },
            bloodPressureSystolic: { value: 120, unit: 'mmHg', timestamp: new Date().toISOString() },
            bloodPressureDiastolic: { value: 80, unit: 'mmHg', timestamp: new Date().toISOString() },
            respiratoryRate: { value: 16, unit: 'breaths/min', timestamp: new Date().toISOString() },
            vo2Max: { value: 42.8, unit: 'ml/kg/min', timestamp: new Date().toISOString() }
          },
          activityData: {
            steps: { value: 12547, unit: 'count', timestamp: new Date().toISOString() },
            distanceWalkingRunning: { value: 8.2, unit: 'km', timestamp: new Date().toISOString() },
            activeEnergyBurned: { value: 650, unit: 'kcal', timestamp: new Date().toISOString() },
            exerciseTime: { value: 45, unit: 'minutes', timestamp: new Date().toISOString() }
          }
        },
        recorded_at: new Date().toISOString(),
        processing_status: 'pending'
      },
      
      // Sleep & Recovery focused sample
      {
        user_id,
        device_type: 'Apple Watch Series 9',
        raw_payload: {
          dataType: 'comprehensive_sleep_recovery',
          source: 'apple_health',
          sleepData: {
            sleepAnalysis: {
              timeInBed: { value: 480, unit: 'minutes' },
              timeAsleep: { value: 420, unit: 'minutes' },
              awakeTime: { value: 60, unit: 'minutes' },
              remSleep: { value: 105, unit: 'minutes' },
              coreSleep: { value: 210, unit: 'minutes' },
              deepSleep: { value: 105, unit: 'minutes' },
              sleepQuality: { value: 85, unit: 'score' },
              timestamp: new Date(Date.now() - 8*60*60*1000).toISOString() // 8 hours ago
            },
            restingHeartRate: { value: 58, unit: 'bpm', timestamp: new Date().toISOString() },
            heartRateVariability: { value: 52.3, unit: 'ms', timestamp: new Date().toISOString() }
          },
          recoveryData: {
            stressLevel: { value: 3, unit: 'scale_1_10', timestamp: new Date().toISOString() },
            recoveryScore: { value: 78, unit: 'percentage', timestamp: new Date().toISOString() }
          }
        },
        recorded_at: new Date(Date.now() - 8*60*60*1000).toISOString(),
        processing_status: 'pending'
      },
      
      // Nutrition & Body Composition sample
      {
        user_id,
        device_type: 'Apple Health',
        raw_payload: {
          dataType: 'comprehensive_nutrition_body',
          source: 'apple_health',
          nutritionData: {
            dietaryEnergyConsumed: { value: 2150, unit: 'kcal', timestamp: new Date().toISOString() },
            protein: { value: 95, unit: 'g', timestamp: new Date().toISOString() },
            carbohydrates: { value: 280, unit: 'g', timestamp: new Date().toISOString() },
            totalFat: { value: 72, unit: 'g', timestamp: new Date().toISOString() },
            fiber: { value: 28, unit: 'g', timestamp: new Date().toISOString() },
            water: { value: 2800, unit: 'ml', timestamp: new Date().toISOString() },
            vitaminC: { value: 85, unit: 'mg', timestamp: new Date().toISOString() },
            vitaminD: { value: 15, unit: 'mcg', timestamp: new Date().toISOString() },
            calcium: { value: 950, unit: 'mg', timestamp: new Date().toISOString() },
            iron: { value: 12, unit: 'mg', timestamp: new Date().toISOString() }
          },
          bodyData: {
            weight: { value: 72.5, unit: 'kg', timestamp: new Date().toISOString() },
            height: { value: 175, unit: 'cm', timestamp: new Date().toISOString() },
            bodyMassIndex: { value: 23.7, unit: 'kg/m²', timestamp: new Date().toISOString() },
            bodyFatPercentage: { value: 15.2, unit: '%', timestamp: new Date().toISOString() },
            leanBodyMass: { value: 61.5, unit: 'kg', timestamp: new Date().toISOString() },
            waistCircumference: { value: 82, unit: 'cm', timestamp: new Date().toISOString() }
          }
        },
        recorded_at: new Date().toISOString(),
        processing_status: 'pending'
      },
      
      // Clinical & Mental Health sample
      {
        user_id,
        device_type: 'Apple Health',
        raw_payload: {
          dataType: 'comprehensive_clinical_mental',
          source: 'apple_health',
          clinicalData: {
            medications: [
              { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'daily' },
              { name: 'Omega-3', dosage: '1000 mg', frequency: 'daily' }
            ],
            allergies: ['Peanuts', 'Shellfish'],
            conditions: ['Seasonal Allergies'],
            labResults: [
              { type: 'Cholesterol Total', value: 185, unit: 'mg/dL', date: new Date().toISOString() },
              { type: 'HDL Cholesterol', value: 58, unit: 'mg/dL', date: new Date().toISOString() },
              { type: 'LDL Cholesterol', value: 110, unit: 'mg/dL', date: new Date().toISOString() }
            ]
          },
          mentalHealthData: {
            mindfulSession: { value: 15, unit: 'minutes', timestamp: new Date().toISOString() },
            moodScore: { value: 7, unit: 'scale_1_10', timestamp: new Date().toISOString() },
            stateOfMind: { value: 'Pleasant', category: 'mental_wellbeing', timestamp: new Date().toISOString() }
          },
          symptomsLogged: [
            { symptom: 'Headache', severity: 'mild', timestamp: new Date(Date.now() - 2*24*60*60*1000).toISOString() }
          ]
        },
        recorded_at: new Date().toISOString(),
        processing_status: 'pending'
      },
      
      // Reproductive Health sample (if applicable)
      {
        user_id,
        device_type: 'Apple Health',
        raw_payload: {
          dataType: 'comprehensive_reproductive',
          source: 'apple_health',
          reproductiveData: {
            basalBodyTemperature: { value: 36.7, unit: '°C', timestamp: new Date().toISOString() },
            menstrualFlow: { value: 'medium', timestamp: new Date().toISOString() },
            cervicalMucusQuality: { value: 'creamy', timestamp: new Date().toISOString() },
            ovulationTestResult: { value: 'negative', timestamp: new Date().toISOString() }
          }
        },
        recorded_at: new Date().toISOString(),
        processing_status: 'pending'
      }
    ];

    console.log(`Inserting ${comprehensiveHealthSamples.length} comprehensive health samples...`);
    
    // Insert all samples
    const insertedSamples = [];
    for (const sample of comprehensiveHealthSamples) {
      const { data: rawData, error: rawError } = await supabase
        .from('raw_health_data')
        .insert(sample)
        .select('id')
        .single();

      if (rawError) {
        console.error('Error inserting sample:', rawError);
        continue;
      }

      console.log(`Inserted raw data sample: ${rawData.id}`);
      
      // Trigger comprehensive processing
      try {
        const { data: processResult, error: processError } = await supabase.functions.invoke('comprehensive-apple-health-processor', {
          body: { raw_data_id: rawData.id }
        });
        
        if (processError) {
          console.error('Error processing sample:', processError);
        } else {
          console.log(`Successfully processed sample: ${rawData.id}`);
          insertedSamples.push({
            raw_data_id: rawData.id,
            data_type: sample.raw_payload.dataType,
            processed: !processError
          });
        }
      } catch (processingError) {
        console.error('Exception during processing:', processingError);
      }
    }

    console.log(`Successfully created ${insertedSamples.length} comprehensive health samples`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Comprehensive HealthKit test data created successfully',
      samples_created: insertedSamples.length,
      samples: insertedSamples,
      user_id: user_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating comprehensive test data:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});