// IDIA Protocol: Apple Health Sync (DELT-Verified)
// Canonical ingestion path: apple-health-sync → raw_health_data → (trigger) → idia-synapse → anonymization-processor → staged_health_data → process-staged-data → credit-user-wallet
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Apple HealthKit identifiers to internal schema keys
const healthKitKeyMapping: Record<string, string> = {
  "HKQuantityTypeIdentifierStepCount": "steps",
  "HKQuantityTypeIdentifierDistanceWalkingRunning": "distanceWalkingRunning",
  "HKQuantityTypeIdentifierDistanceCycling": "distanceCycling",
  "HKQuantityTypeIdentifierFlightsClimbed": "flightsClimbed",
  "HKQuantityTypeIdentifierActiveEnergyBurned": "activeEnergyBurned",
  "HKQuantityTypeIdentifierBasalEnergyBurned": "restingEnergyBurned",
  "HKQuantityTypeIdentifierAppleExerciseTime": "exerciseTime",
  "HKQuantityTypeIdentifierHeartRate": "heartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "heartRateVariability",
  "HKQuantityTypeIdentifierOxygenSaturation": "bloodOxygenSaturation",
  "HKQuantityTypeIdentifierBloodPressureSystolic": "bloodPressureSystolic",
  "HKQuantityTypeIdentifierBloodPressureDiastolic": "bloodPressureDiastolic",
  "HKQuantityTypeIdentifierRespiratoryRate": "respiratoryRate",
  "HKQuantityTypeIdentifierBodyTemperature": "bodyTemperature",
  "HKQuantityTypeIdentifierVO2Max": "vo2Max",
  "HKQuantityTypeIdentifierHeight": "height",
  "HKQuantityTypeIdentifierBodyMass": "weight",
  "HKQuantityTypeIdentifierBodyMassIndex": "bodyMassIndex",
  "HKQuantityTypeIdentifierBodyFatPercentage": "bodyFatPercentage",
  "HKQuantityTypeIdentifierLeanBodyMass": "leanBodyMass",
  "HKQuantityTypeIdentifierWaistCircumference": "waistCircumference",
  "HKQuantityTypeIdentifierDietaryEnergyConsumed": "dietaryEnergyConsumed",
  "HKQuantityTypeIdentifierDietaryFatTotal": "totalFat",
  "HKQuantityTypeIdentifierDietaryFatSaturated": "saturatedFat",
  "HKQuantityTypeIdentifierDietaryCarbohydrates": "carbohydrates",
  "HKQuantityTypeIdentifierDietaryFiber": "fiber",
  "HKQuantityTypeIdentifierDietarySugar": "sugar",
  "HKQuantityTypeIdentifierDietaryProtein": "protein",
  "HKQuantityTypeIdentifierDietaryWater": "water",
  "HKQuantityTypeIdentifierDietaryCaffeine": "caffeine",
  "HKQuantityTypeIdentifierWalkingSpeed": "walkingSpeed",
  "HKQuantityTypeIdentifierWalkingStepLength": "stepLength",
  "HKCategoryTypeIdentifierSleepAnalysis": "sleepAnalysis",
  "HKCategoryTypeIdentifierMindfulSession": "mindfulSession",
  "HKCategoryTypeIdentifierMenstrualFlow": "menstrualFlow",
  "HKQuantityTypeIdentifierBasalBodyTemperature": "basalBodyTemperature",
  "HKWorkoutTypeIdentifier": "workouts",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
    });

    const rawBody = await req.json().catch(() => ({}));

    // Parse query params (native iOS bridge sends aca_hash as URL param)
    const url = new URL(req.url);
    const queryAcaHash = url.searchParams.get("aca_hash");

    // Fuzzy key matching — prioritize query param from native bridge
    const userId = rawBody.user_id || rawBody.userId || rawBody.config?.user_id;
    const acaHash = queryAcaHash || rawBody.aca_hash || rawBody.acaHash;

    // Broad health data extraction — the iOS bridge may use various keys
    let healthData = rawBody.apple_health_data || rawBody.healthData || rawBody.health_data
      || rawBody.data || rawBody.samples || rawBody.config?.apple_health_data
      || rawBody.config?.healthData || rawBody.config?.health_data;

    // If no nested health data object found, check if health types are at the root level
    // (e.g., the bridge sends { user_id, aca_hash, steps: [...], heartRate: [...] })
    if (!healthData || (typeof healthData === "object" && Object.keys(healthData).length === 0)) {
      const knownHealthKeys = Object.values(healthKitKeyMapping);
      const allKnownKeys = [...Object.keys(healthKitKeyMapping), ...knownHealthKeys];
      const rootHealthData: Record<string, any> = {};
      for (const key of Object.keys(rawBody)) {
        if (allKnownKeys.includes(key)) {
          rootHealthData[key] = rawBody[key];
        }
      }
      if (Object.keys(rootHealthData).length > 0) {
        healthData = rootHealthData;
      }
    }

    console.log("Raw body keys:", Object.keys(rawBody));
    console.log("Health data source resolved:", healthData ? Object.keys(healthData).length + " keys" : "null");
    const automatedSync = rawBody.automated_sync || false;
    const forceRealDataOnly = rawBody.force_real_data_only || false;

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required field: user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!acaHash) {
      return new Response(JSON.stringify({ success: false, error: "Missing required field: aca_hash. DELT Protocol requires a valid audit anchor." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELT/ACA Verification — lookup user's platform_guid first, then verify ACA against it
    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_guid")
      .eq("user_id", userId)
      .maybeSingle();

    const platformGuid = profile?.platform_guid;
    if (!platformGuid) {
      return new Response(JSON.stringify({ success: false, error: "No profile/platform_guid found for user" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: acaRecord } = await supabase
      .from("user_aca_records")
      .select("id")
      .eq("aca_hash_key", acaHash)
      .eq("platform_guid", platformGuid)
      .maybeSingle();

    if (!acaRecord) {
      return new Response(JSON.stringify({ success: false, error: "DELT Protocol Verification Failed. No matching audit record found." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ DELT Protocol verified for user:", userId, "platform_guid:", platformGuid);

    // Normalize incoming payload keys — map Apple HealthKit identifiers to internal keys
    let processableData: any = {};
    if (healthData && typeof healthData === "object") {
      Object.keys(healthData).forEach((key: string) => {
        const normalizedKey = healthKitKeyMapping[key] || key;
        processableData[normalizedKey] = healthData[key];
      });
    }

    console.log("Normalized health data keys:", Object.keys(processableData));

    // Handle automated sync with no health data
    if ((automatedSync || forceRealDataOnly) && Object.keys(processableData).length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No new health data available for sync", processed_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Object.keys(processableData).length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Missing required field: apple_health_data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter simulated data for automated syncs
    if (automatedSync || forceRealDataOnly) {
      const filteredData: Record<string, unknown[]> = {};
      Object.keys(processableData).forEach((dataType: string) => {
        if (Array.isArray(processableData[dataType])) {
          const realOnly = processableData[dataType].filter((item: any) => {
            if (typeof item !== "object" || item === null) return true; // primitives are real
            return !(item.simulated === true || item.metadata?.simulated === true || (typeof item.value === "object" && item.value?.simulated === true));
          });
          if (realOnly.length > 0) filteredData[dataType] = realOnly;
        } else {
          // Non-array values (single records) — keep unless simulated
          filteredData[dataType] = [processableData[dataType]];
        }
      });
      const filteredCount = Object.values(filteredData).reduce((t, arr) => t + arr.length, 0);
      if (filteredCount === 0) {
        return new Response(JSON.stringify({ success: true, message: "Only simulated data filtered out", processed_count: 0, skipped_simulated: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      processableData = filteredData;
    }

    console.log("Processing Apple Health data for user:", userId, "types:", Object.keys(processableData));

    // Update connection status
    await supabase.from("data_connections").upsert({
      user_id: userId,
      connection_type: "apple_health",
      connection_name: "Apple Health",
      is_active: true,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: "user_id,connection_type" });

    // Process health data into raw_health_data (the canonical table) — BATCHED
    const processedData: any[] = [];
    const recordsToInsert: any[] = [];
    const healthDataTypes = [
      "steps", "distanceWalkingRunning", "distanceCycling", "flightsClimbed",
      "activeEnergyBurned", "restingEnergyBurned", "exerciseTime",
      "heartRate", "heartRateVariability", "bloodOxygenSaturation",
      "bloodPressureSystolic", "bloodPressureDiastolic", "respiratoryRate",
      "bodyTemperature", "vo2Max",
      "height", "weight", "bodyMassIndex", "bodyFatPercentage",
      "leanBodyMass", "waistCircumference",
      "dietaryEnergyConsumed", "totalFat", "saturatedFat", "carbohydrates",
      "fiber", "sugar", "protein", "water", "caffeine",
      "sleep", "sleepAnalysis",
      "walkingSpeed", "stepLength",
      "menstrualFlow", "basalBodyTemperature",
      "mindfulSession", "moodScore", "stateOfMind",
      "symptoms", "clinicalRecords", "medications",
    ];

    for (const dataType of healthDataTypes) {
      if (!processableData[dataType]) continue;
      const dataArray = Array.isArray(processableData[dataType]) ? processableData[dataType] : [processableData[dataType]];
      for (const record of dataArray) {
        const actualValue = (typeof record === "object" && record !== null && record.value !== undefined)
          ? record.value
          : record;

        const healthRecord: any = {
          user_id: userId,
          device_type: "Apple Health",
          raw_payload: {
            dataType,
            value: actualValue,
            unit: (typeof record === "object" && record !== null) ? (record.unit || null) : null,
            startDate: (typeof record === "object" && record !== null) ? (record.startDate || record.date) : null,
            endDate: (typeof record === "object" && record !== null) ? (record.endDate || record.date) : null,
            sourceBundle: (typeof record === "object" && record !== null) ? (record.sourceBundle || "com.apple.health") : "com.apple.health",
            sourceName: (typeof record === "object" && record !== null) ? (record.sourceName || "Apple Health") : "Apple Health",
            metadata: (typeof record === "object" && record !== null) ? (record.metadata || {}) : {},
            originalRecord: typeof record === "object" ? record : { value: actualValue },
          },
          recorded_at: (typeof record === "object" && record !== null) ? (record.startDate || record.date || new Date().toISOString()) : new Date().toISOString(),
          processing_status: "pending",
          processed: false,
        };

        if (dataType === "steps" && actualValue !== undefined && actualValue !== null) {
          const parsed = parseInt(String(actualValue));
          if (!isNaN(parsed)) healthRecord.step_count = parsed;
        }

        recordsToInsert.push({ __dataType: dataType, __actualValue: actualValue, __recordedAt: healthRecord.recorded_at, ...healthRecord });
      }
    }

    // Process workouts → batch
    if (processableData.workouts && Array.isArray(processableData.workouts)) {
      for (const workout of processableData.workouts) {
        const rec = {
          user_id: userId,
          device_type: "Apple Health",
          raw_payload: {
            dataType: "workout",
            workoutActivityType: workout.workoutActivityType,
            duration: workout.duration,
            totalEnergyBurned: workout.totalEnergyBurned,
            totalDistance: workout.totalDistance,
            startDate: workout.startDate,
            endDate: workout.endDate,
            sourceBundle: workout.sourceBundle || "com.apple.health",
            heartRateSamples: workout.heartRateSamples || [],
            route: workout.route || null,
            metadata: workout.metadata || {},
            originalRecord: workout,
          },
          recorded_at: workout.startDate,
          processing_status: "pending",
          processed: false,
        };
        recordsToInsert.push({ __dataType: "workout", __actualValue: workout.workoutActivityType, __recordedAt: workout.startDate, ...rec });
      }
    }

    // Bulk insert in chunks (Postgres handles ~1000 row inserts well; chunk at 500 to be safe)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
      const cleanChunk = chunk.map(({ __dataType, __actualValue, __recordedAt, ...rest }) => rest);
      try {
        const { data: inserted, error: insertError } = await supabase
          .from("raw_health_data")
          .insert(cleanChunk)
          .select("id");

        if (insertError) {
          console.error(`Batch insert error (chunk ${i / CHUNK_SIZE}):`, insertError);
          continue;
        }

        if (inserted) {
          inserted.forEach((row: any, idx: number) => {
            const meta = chunk[idx];
            processedData.push({
              type: meta.__dataType,
              id: row.id,
              value: meta.__actualValue,
              recordedAt: meta.__recordedAt,
            });
          });
        }
      } catch (err) {
        console.error(`Chunk ${i / CHUNK_SIZE} threw:`, err);
      }
    }

    console.log(`✅ Processed ${processedData.length} health records with DELT anchor: ${acaHash.substring(0, 12)}...`);

    return new Response(JSON.stringify({
      success: true,
      message: "Apple Health data synced successfully",
      processed_data: processedData,
      processed_count: processedData.length,
      delt_anchor: acaHash.substring(0, 12),
      sync_timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Apple Health Sync Error:", error.message);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
