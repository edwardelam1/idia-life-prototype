// Canonical ingestion path: apple-health-sync → raw_health_data → (trigger) → synapse-controller → staged_health_data → best-friend-ai
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const healthKitKeyMapping: Record<string, string> = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierDistanceWalkingRunning: "distanceWalkingRunning",
  HKQuantityTypeIdentifierDistanceCycling: "distanceCycling",
  HKQuantityTypeIdentifierFlightsClimbed: "flightsClimbed",
  HKQuantityTypeIdentifierActiveEnergyBurned: "calories",
  HKQuantityTypeIdentifierBasalEnergyBurned: "basalEnergy",
  HKQuantityTypeIdentifierAppleExerciseTime: "exerciseTime",
  HKQuantityTypeIdentifierHeartRate: "heartRate",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierOxygenSaturation: "bloodOxygen",
  HKQuantityTypeIdentifierBloodPressureSystolic: "bpSystolic",
  HKQuantityTypeIdentifierBloodPressureDiastolic: "bpDiastolic",
  HKQuantityTypeIdentifierRespiratoryRate: "respiratoryRate",
  HKQuantityTypeIdentifierBodyTemperature: "bodyTemp",
  HKQuantityTypeIdentifierVO2Max: "vo2max",
  HKQuantityTypeIdentifierHeight: "height",
  HKQuantityTypeIdentifierBodyMass: "weight",
  HKQuantityTypeIdentifierBodyMassIndex: "bodyMassIndex",
  HKQuantityTypeIdentifierBodyFatPercentage: "bodyFatPercentage",
  HKQuantityTypeIdentifierLeanBodyMass: "leanBodyMass",
  HKQuantityTypeIdentifierWaistCircumference: "waistCircumference",
  HKQuantityTypeIdentifierDietaryEnergyConsumed: "dietaryEnergyConsumed",
  HKQuantityTypeIdentifierDietaryFatTotal: "totalFat",
  HKQuantityTypeIdentifierDietaryFatSaturated: "saturatedFat",
  HKQuantityTypeIdentifierDietaryCarbohydrates: "carbohydrates",
  HKQuantityTypeIdentifierDietaryFiber: "fiber",
  HKQuantityTypeIdentifierDietarySugar: "sugar",
  HKQuantityTypeIdentifierDietaryProtein: "protein",
  HKQuantityTypeIdentifierDietaryWater: "water",
  HKQuantityTypeIdentifierDietaryCaffeine: "caffeine",
  HKQuantityTypeIdentifierWalkingSpeed: "walkingSpeed",
  HKQuantityTypeIdentifierWalkingStepLength: "stepLength",
  HKQuantityTypeIdentifierWalkingAsymmetryPercentage: "walkingAsymmetry",
  HKQuantityTypeIdentifierWalkingDoubleSupportPercentage: "doubleSupport",
  HKQuantityTypeIdentifierAppleWalkingSteadiness: "steadiness",
  HKQuantityTypeIdentifierEnvironmentalAudioExposure: "noiseLevel",
  HKQuantityTypeIdentifierUVExposure: "uvExposure",
  HKCategoryTypeIdentifierSleepAnalysis: "sleep",
  HKCategoryTypeIdentifierMindfulSession: "mindfulSession",
  HKCategoryTypeIdentifierMenstrualFlow: "menstrualFlow",
  HKQuantityTypeIdentifierBasalBodyTemperature: "basalBodyTemperature",
  HKWorkoutTypeIdentifier: "workouts",
  steps: "steps",
  heartRate: "heartRate",
  hrv: "hrv",
  restingHR: "restingHR",
  bloodOxygen: "bloodOxygen",
  respiratoryRate: "respiratoryRate",
  walkingSpeed: "walkingSpeed",
  stepLength: "stepLength",
  walkingAsymmetry: "walkingAsymmetry",
  doubleSupport: "doubleSupport",
  steadiness: "steadiness",
  calories: "calories",
  basalEnergy: "basalEnergy",
  noiseLevel: "noiseLevel",
  uvExposure: "uvExposure",
  bodyTemp: "bodyTemp",
  vo2max: "vo2max",
  bpSystolic: "bpSystolic",
  bpDiastolic: "bpDiastolic",
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
    const url = new URL(req.url);
    const queryAcaHash = url.searchParams.get("aca_hash_key");

    // 🚨 FIX 1: Robust extraction supporting top-level and nested config formats
    const userId = rawBody.user_id || rawBody.userId || rawBody.config?.user_id || rawBody.config?.userId;
    const acaHash =
      queryAcaHash ||
      rawBody.aca_hash_key ||
      rawBody.aca_hash ||
      rawBody.acaHash ||
      rawBody.config?.aca_hash_key ||
      rawBody.config?.aca_hash ||
      rawBody.config?.acaHash;

    let healthData =
      rawBody.data ||
      rawBody.apple_health_data ||
      rawBody.healthData ||
      rawBody.health_data ||
      rawBody.samples ||
      rawBody.config?.apple_health_data ||
      rawBody.config?.healthData ||
      rawBody.config?.health_data;

    if (
      !healthData ||
      (typeof healthData === "object" && !Array.isArray(healthData) && Object.keys(healthData).length === 0)
    ) {
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

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required field: user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!acaHash) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: aca_hash_key. DELT Protocol requires a valid audit anchor.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // DELT/ACA Lineage Verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_guid")
      .eq("user_id", userId)
      .maybeSingle();

    const platformGuid = profile?.platform_guid;
    if (!platformGuid) {
      return new Response(JSON.stringify({ success: false, error: "No profile/platform_guid found for user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: acaRecord } = await supabase
      .from("user_aca_records")
      .select("id")
      .eq("aca_hash_key", acaHash)
      .eq("platform_guid", platformGuid)
      .maybeSingle();

    if (!acaRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "DELT Protocol Verification Failed. No matching audit record found." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("✅ DELT Protocol verified for user:", userId);

    // Stamp data_connections on a verified anchor handshake. No upsert: read the
    // existing row first, then insert or update explicitly so a write failure is
    // visible instead of being swallowed behind a conflict clause.
    const payloadSource = String(rawBody.source || rawBody.config?.source || "apple_health").toLowerCase();
    const isHealthConnect = payloadSource.includes("health_connect") || payloadSource.includes("android");
    const connectionType = isHealthConnect ? "health_connect" : "apple_health";
    const connectionName = isHealthConnect ? "Health Connect" : "Apple Health";
    const syncedAt = new Date().toISOString();

    const { data: existingConnection, error: connectionLookupError } = await supabase
      .from("data_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("connection_type", connectionType)
      .maybeSingle();

    if (connectionLookupError) {
      console.error("[HEALTH_SYNC] connection lookup failed:", connectionLookupError.message);
      return new Response(
        JSON.stringify({ success: false, error: `Could not read your connection record: ${connectionLookupError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const connectionWrite = existingConnection?.id
      ? await supabase
          .from("data_connections")
          .update({ connection_name: connectionName, is_active: true, last_sync_at: syncedAt })
          .eq("id", existingConnection.id)
      : await supabase.from("data_connections").insert({
          user_id: userId,
          connection_type: connectionType,
          connection_name: connectionName,
          is_active: true,
          last_sync_at: syncedAt,
        });

    if (connectionWrite.error) {
      console.error("[HEALTH_SYNC] connection write failed:", connectionWrite.error.message);
      return new Response(
        JSON.stringify({ success: false, error: `Could not save your connection: ${connectionWrite.error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[HEALTH_SYNC] connection anchored (${connectionType}) for user ${userId}`);


    // Normalize incoming payload keys
    let processableData: any = {};
    if (healthData && typeof healthData === "object" && !Array.isArray(healthData)) {
      Object.keys(healthData).forEach((key: string) => {
        const normalizedKey = healthKitKeyMapping[key] || key;
        processableData[normalizedKey] = healthData[key];
      });
    }

    const healthDataTypes = [
      "steps",
      "heartRate",
      "hrv",
      "restingHR",
      "bloodOxygen",
      "respiratoryRate",
      "walkingSpeed",
      "stepLength",
      "walkingAsymmetry",
      "doubleSupport",
      "steadiness",
      "calories",
      "basalEnergy",
      "noiseLevel",
      "uvExposure",
      "bodyTemp",
      "vo2max",
      "bpSystolic",
      "bpDiastolic",
      "sleep",
      "sleepAnalysis",
      "distanceWalkingRunning",
      "distanceCycling",
      "flightsClimbed",
      "exerciseTime",
      "bloodOxygenSaturation",
    ];

    const recordsToInsert: any[] = [];

    // CASE 1: Native Firehose Array
    if (Array.isArray(healthData)) {
      for (const item of healthData) {
        const rawType = item.dataType || item.type || item.typeIdentifier;
        const dataType = healthKitKeyMapping[rawType] || rawType;
        if (!healthDataTypes.includes(dataType)) continue;

        const actualValue = typeof item === "object" && item !== null && item.value !== undefined ? item.value : item;

        recordsToInsert.push({
          user_id: userId,
          aca_hash_key: acaHash,
          device_type: "Apple Health",
          raw_payload: {
            dataType,
            value: actualValue,
            metadata: item.metadata || {},
            src_v: item.metadata?.src_v || "Native-PureAlpha",
          },
          recorded_at: item.startDate || item.date || new Date().toISOString(),
          processing_status: "pending",
          processed: false,
          step_count: dataType === "steps" ? parseInt(String(actualValue)) : null,
        });
      }
    }
    // CASE 2: Structured Object
    else {
      for (const dataType of healthDataTypes) {
        if (!processableData[dataType]) continue;
        const dataArray = Array.isArray(processableData[dataType])
          ? processableData[dataType]
          : [processableData[dataType]];
        for (const record of dataArray) {
          const actualValue =
            typeof record === "object" && record !== null && record.value !== undefined ? record.value : record;

          const healthRecord: any = {
            user_id: userId,
            aca_hash_key: acaHash,
            device_type: "Apple Health",
            raw_payload: {
              dataType,
              value: actualValue,
              unit: typeof record === "object" && record !== null ? record.unit || null : null,
              startDate: typeof record === "object" && record !== null ? record.startDate || record.date : null,
              endDate: typeof record === "object" && record !== null ? record.endDate || record.date : null,
              sourceBundle:
                typeof record === "object" && record !== null
                  ? record.sourceBundle || "com.apple.health"
                  : "com.apple.health",
              sourceName:
                typeof record === "object" && record !== null ? record.sourceName || "Apple Health" : "Apple Health",
              metadata: typeof record === "object" && record !== null ? record.metadata || {} : {},
              originalRecord: typeof record === "object" ? record : { value: actualValue },
            },
            recorded_at:
              typeof record === "object" && record !== null
                ? record.startDate || record.date || new Date().toISOString()
                : new Date().toISOString(),
            processing_status: "pending",
            processed: false,
          };

          if (dataType === "steps" && actualValue !== undefined && actualValue !== null) {
            const parsed = parseInt(String(actualValue));
            if (!isNaN(parsed)) healthRecord.step_count = parsed;
          }

          recordsToInsert.push({
            __dataType: dataType,
            __actualValue: actualValue,
            __recordedAt: healthRecord.recorded_at,
            ...healthRecord,
          });
        }
      }
    }

    // Workouts
    if (processableData.workouts && Array.isArray(processableData.workouts)) {
      for (const workout of processableData.workouts) {
        const rec = {
          user_id: userId,
          aca_hash_key: acaHash,
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
        recordsToInsert.push({
          __dataType: "workout",
          __actualValue: workout.workoutActivityType,
          __recordedAt: workout.startDate,
          ...rec,
        });
      }
    }

    // 🚨 FIX 3: If 0 records were found, return the full anchor payload so the modal resolves cleanly
    if (recordsToInsert.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Connection anchored successfully; no new samples to ingest.",
          processed_data: [],
          processed_count: 0,
          delt_anchor: acaHash.substring(0, 12),
          sync_timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Batch insertion
    const processedData: any[] = [];
    const CHUNK_SIZE = 100;

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
              type: meta.__dataType || meta.raw_payload.dataType,
              id: row.id,
              value: meta.__actualValue || meta.raw_payload.value,
              recordedAt: meta.__recordedAt || meta.recorded_at,
            });
          });
        }
      } catch (err) {
        console.error(`Chunk ${i / CHUNK_SIZE} threw exception:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Apple Health data synced successfully via IDIA Protocol",
        processed_data: processedData,
        processed_count: processedData.length,
        delt_anchor: acaHash.substring(0, 12),
        sync_timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("🚨 [SYSTEM_STALL] Apple Health Sync Error:", message);
    return new Response(JSON.stringify({ error: message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
