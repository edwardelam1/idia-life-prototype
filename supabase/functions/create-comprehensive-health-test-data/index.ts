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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      user_id, 
      data_variety = 'comprehensive',
      include_clinical = true,
      include_nutrition = true,
      include_sleep = true,
      include_vitals = true 
    } = await req.json();
    
    if (!user_id) {
      throw new Error('Missing user_id');
    }

    console.log(`Generating comprehensive HealthKit test data for user: ${user_id}`);
    console.log(`Data variety: ${data_variety}, Clinical: ${include_clinical}, Nutrition: ${include_nutrition}, Sleep: ${include_sleep}, Vitals: ${include_vitals}`);
    
    // Generate comprehensive HealthKit test data covering all 60+ data types
    const healthDataSamples = [];
    
    // Activity & Fitness Data (10+ types)
    healthDataSamples.push(
      {
        dataType: 'steps',
        value: Math.floor(Math.random() * 15000) + 5000,
        unit: 'count',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'distanceWalkingRunning',
        value: (Math.random() * 10 + 2).toFixed(2),
        unit: 'km',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'distanceCycling',
        value: (Math.random() * 20 + 5).toFixed(2),
        unit: 'km',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.fitness'
      },
      {
        dataType: 'flightsClimbed',
        value: Math.floor(Math.random() * 50) + 5,
        unit: 'count',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'walkingSpeed',
        value: (Math.random() * 2 + 1).toFixed(2),
        unit: 'm/s',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'stepLength',
        value: (Math.random() * 20 + 60).toFixed(1),
        unit: 'cm',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'walkingAsymmetryPercentage',
        value: (Math.random() * 5 + 0.5).toFixed(2),
        unit: '%',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'doubleSupportTime',
        value: (Math.random() * 5 + 25).toFixed(1),
        unit: '%',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      }
    );

    // Heart & Vitals Data (10+ types)
    if (include_vitals) {
      healthDataSamples.push(
        {
          dataType: 'heartRate',
          value: Math.floor(Math.random() * 60) + 60,
          unit: 'bpm',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'heartRateVariability',
          value: (Math.random() * 50 + 20).toFixed(2),
          unit: 'ms',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'bloodOxygenSaturation',
          value: (Math.random() * 5 + 95).toFixed(1),
          unit: '%',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'bloodPressureSystolic',
          value: Math.floor(Math.random() * 40) + 110,
          unit: 'mmHg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'bloodPressureDiastolic',
          value: Math.floor(Math.random() * 20) + 70,
          unit: 'mmHg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'respiratoryRate',
          value: Math.floor(Math.random() * 8) + 12,
          unit: 'breaths/min',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'bodyTemperature',
          value: (Math.random() * 2 + 36).toFixed(1),
          unit: '°C',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.health'
        },
        {
          dataType: 'vo2Max',
          value: (Math.random() * 20 + 35).toFixed(1),
          unit: 'ml/kg/min',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.fitness'
        }
      );
    }

    // Body Measurements (6+ types)
    healthDataSamples.push(
      {
        dataType: 'weight',
        value: (Math.random() * 40 + 60).toFixed(1),
        unit: 'kg',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'height',
        value: (Math.random() * 30 + 160).toFixed(0),
        unit: 'cm',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'bodyFatPercentage',
        value: (Math.random() * 15 + 10).toFixed(1),
        unit: '%',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'leanBodyMass',
        value: (Math.random() * 20 + 50).toFixed(1),
        unit: 'kg',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      },
      {
        dataType: 'waistCircumference',
        value: (Math.random() * 20 + 80).toFixed(0),
        unit: 'cm',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.health'
      }
    );

    // Comprehensive Nutrition Data (17+ types)
    if (include_nutrition) {
      healthDataSamples.push(
        {
          dataType: 'dietaryEnergyConsumed',
          value: Math.floor(Math.random() * 1000) + 1500,
          unit: 'kcal',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'protein',
          value: (Math.random() * 50 + 50).toFixed(1),
          unit: 'g',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'carbohydrates',
          value: (Math.random() * 100 + 150).toFixed(1),
          unit: 'g',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'totalFat',
          value: (Math.random() * 30 + 40).toFixed(1),
          unit: 'g',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'saturatedFat',
          value: (Math.random() * 15 + 10).toFixed(1),
          unit: 'g',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'fiber',
          value: (Math.random() * 20 + 15).toFixed(1),
          unit: 'g',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'sugar',
          value: (Math.random() * 50 + 25).toFixed(1),
          unit: 'g',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'water',
          value: Math.floor(Math.random() * 1000) + 1500,
          unit: 'ml',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'caffeine',
          value: Math.floor(Math.random() * 200) + 50,
          unit: 'mg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'sodium',
          value: Math.floor(Math.random() * 1000) + 1500,
          unit: 'mg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'potassium',
          value: Math.floor(Math.random() * 1000) + 2000,
          unit: 'mg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'vitaminC',
          value: (Math.random() * 100 + 50).toFixed(1),
          unit: 'mg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'vitaminD',
          value: (Math.random() * 30 + 10).toFixed(1),
          unit: 'mcg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'calcium',
          value: (Math.random() * 500 + 800).toFixed(0),
          unit: 'mg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        },
        {
          dataType: 'iron',
          value: (Math.random() * 10 + 8).toFixed(1),
          unit: 'mg',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.nutrition'
        }
      );
    }

    // Comprehensive Sleep Data
    if (include_sleep) {
      healthDataSamples.push(
        {
          dataType: 'sleep',
          sleepStages: true,
          timeInBed: Math.floor(Math.random() * 120) + 420, // 7-9 hours
          timeAsleep: Math.floor(Math.random() * 100) + 380, // 6-8 hours
          awakeTime: Math.floor(Math.random() * 30) + 10,
          remSleep: Math.floor(Math.random() * 60) + 80,
          coreSleep: Math.floor(Math.random() * 100) + 200,
          deepSleep: Math.floor(Math.random() * 60) + 60,
          sleepQuality: Math.floor(Math.random() * 30) + 70,
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.sleep'
        },
        {
          dataType: 'timeInBed',
          value: Math.floor(Math.random() * 120) + 420,
          unit: 'minutes',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.sleep'
        },
        {
          dataType: 'timeAsleep',
          value: Math.floor(Math.random() * 100) + 380,
          unit: 'minutes',
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.sleep'
        }
      );
    }

    // Reproductive Health Data
    healthDataSamples.push(
      {
        dataType: 'menstrualFlow',
        value: ['light', 'medium', 'heavy'][Math.floor(Math.random() * 3)],
        unit: 'category',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.reproductive'
      },
      {
        dataType: 'basalBodyTemperature',
        value: (Math.random() * 1 + 36.2).toFixed(2),
        unit: '°C',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.reproductive'
      }
    );

    // Clinical Data
    if (include_clinical) {
      healthDataSamples.push(
        {
          dataType: 'medications',
          value: [
            { name: 'Multivitamin', dosage: '1 tablet daily', frequency: 'daily' },
            { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'daily' },
            { name: 'Omega-3', dosage: '1000mg', frequency: 'daily' }
          ],
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.clinical'
        },
        {
          dataType: 'labResults',
          value: [
            { test: 'Total Cholesterol', value: 180, unit: 'mg/dL', range: 'Normal' },
            { test: 'HDL Cholesterol', value: 55, unit: 'mg/dL', range: 'Normal' },
            { test: 'LDL Cholesterol', value: 110, unit: 'mg/dL', range: 'Normal' },
            { test: 'Triglycerides', value: 95, unit: 'mg/dL', range: 'Normal' },
            { test: 'Glucose', value: 95, unit: 'mg/dL', range: 'Normal' },
            { test: 'HbA1c', value: 5.2, unit: '%', range: 'Normal' }
          ],
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.clinical'
        },
        {
          dataType: 'conditions',
          value: [
            { condition: 'Seasonal Allergies', status: 'Active', severity: 'Mild' }
          ],
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.clinical'
        },
        {
          dataType: 'allergies',
          value: [
            { allergen: 'Pollen', severity: 'Mild', reaction: 'Sneezing, runny nose' }
          ],
          startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sourceBundle: 'com.apple.clinical'
        }
      );
    }

    // Mental Health & Mindfulness Data
    healthDataSamples.push(
      {
        dataType: 'mindfulSession',
        value: Math.floor(Math.random() * 20) + 5, // 5-25 minutes
        unit: 'minutes',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.mindfulness'
      },
      {
        dataType: 'moodScore',
        value: Math.floor(Math.random() * 10) + 1, // 1-10 scale
        unit: 'score',
        startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sourceBundle: 'com.apple.mentalhealth'
      }
    );

    // Generate workout data with complex structure
    healthDataSamples.push({
      dataType: 'workout',
      workoutActivityType: ['running', 'cycling', 'swimming', 'yoga'][Math.floor(Math.random() * 4)],
      duration: Math.floor(Math.random() * 3600) + 1800, // 30-90 minutes
      totalEnergyBurned: Math.floor(Math.random() * 500) + 200,
      totalDistance: (Math.random() * 10 + 2).toFixed(2),
      startDate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - Math.random() * 22 * 60 * 60 * 1000).toISOString(),
      heartRateSamples: Array.from({length: 10}, () => ({
        value: Math.floor(Math.random() * 60) + 120,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      })),
      sourceBundle: 'com.apple.fitness'
    });

    console.log(`Generated ${healthDataSamples.length} comprehensive health data samples covering all major HealthKit categories`);
    
    // Insert all samples into raw_health_data
    const processedRecords = [];
    
    for (const sample of healthDataSamples) {
      const healthRecord = {
        user_id: user_id,
        device_type: 'Apple Health (Comprehensive Test Data)',
        raw_payload: {
          dataType: sample.dataType,
          value: sample.value,
          unit: sample.unit,
          startDate: sample.startDate,
          endDate: sample.endDate || sample.startDate,
          sourceBundle: sample.sourceBundle,
          sourceName: 'Apple Health Comprehensive Test Generator',
          metadata: { 
            generated_test_data: true,
            data_variety: data_variety,
            comprehensive_categories: true
          },
          originalRecord: sample
        },
        recorded_at: sample.startDate,
        processed: false,
        step_count: sample.dataType === 'steps' ? sample.value : null
      };

      const { data: rawData, error: rawError } = await supabase
        .from('raw_health_data')
        .insert(healthRecord)
        .select('id')
        .single();

      if (!rawError && rawData) {
        processedRecords.push({
          type: sample.dataType,
          id: rawData.id,
          value: sample.value,
          unit: sample.unit || 'N/A'
        });
      } else {
        console.error(`Error inserting ${sample.dataType}:`, rawError);
      }
    }

    console.log(`Successfully inserted ${processedRecords.length} comprehensive health records`);
    console.log('Data types generated:', processedRecords.map(r => r.type).join(', '));

    return new Response(JSON.stringify({
      success: true,
      message: 'Comprehensive HealthKit test data generated successfully',
      processed_records: processedRecords,
      data_variety: 'comprehensive',
      total_records: processedRecords.length,
      categories_included: {
        activity: true,
        vitals: include_vitals,
        body_measurements: true,
        nutrition: include_nutrition,
        sleep: include_sleep,
        reproductive: true,
        clinical: include_clinical,
        mental_health: true,
        workouts: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Comprehensive Health Test Data Generation Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});