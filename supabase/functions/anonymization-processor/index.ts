// IDIA Protocol: Anonymization Processor
// Receives raw_health_data, anonymizes into staged_health_data ONLY
// NO writes to staged_data. Reward pipeline triggered by staged_health_data INSERT trigger.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
    });

    const { raw_data_id, user_id, raw_payload, step_count, recorded_at } = await req.json();

    if (!raw_data_id) {
      return new Response("Missing raw_data_id", { status: 400, headers: corsHeaders });
    }

    console.log(`[Anonymization] Processing raw_data_id: ${raw_data_id}`);

    // Generate pseudonym using the SAME deterministic hash as the DB function generate_pseudonym()
    // DB: encode(sha256((input_text || 'IDIA_SALT_2024')::bytea), 'hex')
    // We must use user_id (not raw_data_id) to match profiles reverse-lookup
    const pseudonymInput = user_id || raw_data_id;
    const encoder = new TextEncoder();
    const hashData = encoder.encode(pseudonymInput + "IDIA_SALT_2024");
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    const pseudonym = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

    console.log(`[Anonymization] Pseudonym for user ${pseudonymInput}: ${pseudonym.substring(0, 16)}...`);

    // Extract health data from raw payload
    const payload = raw_payload || {};
    const dataType = payload.dataType;
    const value = payload.value;
    const unit = payload.unit;
    const originalRecord = payload.originalRecord || payload;

    const data: any = {
      raw_data_id,
      pseudo_user_id: pseudonym,
      activity_type: "health_metrics",
      anonymized_location_zone: null,
      processed_at: new Date().toISOString(),
      device_type: "Apple Health",
    };

    // Map HealthKit data types
    if (dataType) {
      switch (dataType) {
        case "steps":
          data.steps_count = parseInt(value) || step_count;
          data.activity_type = "walking";
          break;
        case "distanceWalkingRunning":
          data.distance_meters = parseFloat(value);
          data.activity_type = "walking";
          break;
        case "distanceCycling":
          data.distance_meters = parseFloat(value);
          data.activity_type = "cycling";
          break;
        case "activeEnergyBurned":
        case "restingEnergyBurned":
          data.calories_burned = parseFloat(value);
          break;
        case "exerciseTime":
          data.duration_seconds = parseFloat(value) * 60;
          break;
        case "heartRate":
          data.average_heartrate = parseInt(value);
          break;
        case "heartRateVariability":
          data.heart_rate_variability_ms = parseFloat(value);
          break;
        case "bloodOxygenSaturation":
          data.blood_oxygen_saturation = parseFloat(value);
          break;
        case "bloodPressureSystolic":
          data.systolic_blood_pressure = parseFloat(value);
          break;
        case "bloodPressureDiastolic":
          data.diastolic_blood_pressure = parseFloat(value);
          break;
        case "respiratoryRate":
          data.respiratory_rate_per_min = parseFloat(value);
          break;
        case "bodyTemperature":
          data.body_temperature_celsius = parseFloat(value);
          break;
        case "vo2Max":
          data.vo2_max = parseFloat(value);
          break;
        case "weight":
          data.weight_kg = parseFloat(value);
          break;
        case "height":
          data.height_cm = unit === "cm" ? parseFloat(value) : parseFloat(value) * 100;
          break;
        case "bodyMassIndex":
          data.body_mass_index = parseFloat(value);
          break;
        case "bodyFatPercentage":
          data.body_fat_percentage = parseFloat(value);
          break;
        case "dietaryEnergyConsumed":
          data.dietary_energy_kcal = parseFloat(value);
          break;
        case "protein":
          data.protein_g = parseFloat(value);
          break;
        case "carbohydrates":
          data.carbohydrates_g = parseFloat(value);
          break;
        case "totalFat":
          data.total_fat_g = parseFloat(value);
          break;
        case "water":
          data.water_ml = parseFloat(value);
          break;
        case "sleep":
        case "sleepAnalysis":
          data.sleep_duration = parseInt(value);
          data.activity_type = "sleep";
          break;
        case "mindfulSession":
          data.mindful_minutes = parseInt(value);
          data.activity_type = "mindfulness";
          break;
        case "moodScore":
        case "stateOfMind":
          data.mood_score = parseInt(value);
          break;
        case "workout":
          data.activity_type = payload.workoutActivityType || "workout";
          data.duration_seconds = parseInt(payload.duration);
          data.distance_meters = parseFloat(payload.totalDistance);
          data.calories_burned = parseFloat(payload.totalEnergyBurned);
          if (payload.heartRateSamples?.length > 0) {
            const hrs = payload.heartRateSamples.map((s: any) => s.value);
            data.average_heartrate = Math.round(hrs.reduce((a: number, b: number) => a + b, 0) / hrs.length);
            data.max_heartrate = Math.max(...hrs);
          }
          break;
        default:
          // Store in steps as fallback if numeric
          if (value && !isNaN(parseFloat(value))) {
            data.steps_count = parseInt(value) || null;
          }
      }
    } else {
      // Legacy format
      data.steps_count = step_count;
      data.average_heartrate = payload.heart_rate || payload.averageHeartRate;
      data.duration_seconds = payload.duration || payload.duration_seconds;
      data.distance_meters = payload.distance || payload.distance_meters;
      data.calories_burned = payload.calories || payload.activeEnergyBurned;
    }

    // Calculate quality & completeness scores
    let qualityScore = 0.3;
    let dataTypeCount = 0;
    if (data.steps_count) { qualityScore += 0.05; dataTypeCount++; }
    if (data.average_heartrate) { qualityScore += 0.05; dataTypeCount++; }
    if (data.calories_burned) { qualityScore += 0.05; dataTypeCount++; }
    if (data.duration_seconds) { qualityScore += 0.05; dataTypeCount++; }
    if (data.heart_rate_variability_ms) { qualityScore += 0.03; dataTypeCount++; }
    if (data.blood_oxygen_saturation) { qualityScore += 0.03; dataTypeCount++; }
    if (data.systolic_blood_pressure) { qualityScore += 0.03; dataTypeCount++; }
    if (data.respiratory_rate_per_min) { qualityScore += 0.03; dataTypeCount++; }
    if (data.body_temperature_celsius) { qualityScore += 0.03; dataTypeCount++; }
    if (data.weight_kg) { qualityScore += 0.05; dataTypeCount++; }
    if (data.body_fat_percentage) { qualityScore += 0.04; dataTypeCount++; }
    if (data.dietary_energy_kcal) { qualityScore += 0.03; dataTypeCount++; }
    if (data.sleep_duration) { qualityScore += 0.05; dataTypeCount++; }
    if (data.mindful_minutes) { qualityScore += 0.03; dataTypeCount++; }
    if (data.mood_score) { qualityScore += 0.02; dataTypeCount++; }
    if (data.distance_meters) { qualityScore += 0.03; dataTypeCount++; }
    if (dataTypeCount >= 5) qualityScore += 0.05;
    if (dataTypeCount >= 10) qualityScore += 0.05;

    data.data_quality_score = Math.min(1.0, qualityScore);
    data.data_completeness_score = Math.min(1.0, dataTypeCount / 15);

    console.log(`[Anonymization] Quality: ${data.data_quality_score}, Completeness: ${data.data_completeness_score}`);

    // Insert ONLY into staged_health_data — the safe_reward_on_staged_health trigger handles the rest
    const { data: stagedHealthData, error: healthError } = await supabase
      .from("staged_health_data")
      .insert(data)
      .select("id")
      .single();

    if (healthError) {
      console.error("[Anonymization] Failed to create staged_health_data:", healthError);
      return new Response(JSON.stringify({ error: "Failed to create anonymized health data", details: healthError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Anonymization] ✅ staged_health_data created: ${stagedHealthData.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Data anonymized and staged successfully",
      staged_health_data_id: stagedHealthData.id,
      pseudonym: pseudonym.substring(0, 16),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Anonymization] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
