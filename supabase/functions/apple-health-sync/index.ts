// Canonical ingestion path: apple-health-sync → raw_health_data → (trigger) → synapse-controller → staged_health_data → best-friend-ai
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idia-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Map Apple HealthKit identifiers to internal schema keys
// Expanded to include the High-Fidelity Discovery labels from Swift
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
  // Direct Bridge Mapping for Tactical Labels
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
  sleep: "sleep",
  weight: "weight",
  height: "height",
};

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
  "weight",
  "height",
];

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  console.log(`--- BEGIN ERROR HANDLING: Edge Function POST Handler ---`);
  console.log(
    `🚨 [EDGE_INIT][BEGIN: Planck.Edge.AppleHealthSync] Processing ${req.method} request. id=${requestId} path=${url.pathname}${url.search} headers=${JSON.stringify(
      [...req.headers.keys()],
    )} len=${req.headers.get("content-length") || "?"}`,
  );

  // STRICT INGRESS: Swift master posts. Nothing else is accepted.
  if (req.method !== "POST") {
    console.log(
      `🚨 [EDGE_METHOD_FATAL][FATAL: Planck.Edge.AppleHealthSync] Rejecting non-POST method: ${req.method}`,
    );
    console.log(
      `🚨 [EDGE_METHOD_FATAL][END: Planck.Edge.AppleHealthSync] -> Silent stalling occurs: Swift pipeline broken by invalid method.`,
    );
    console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);
    return json({ success: false, error: "Method not allowed", request_id: requestId }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return json({ success: false, error: "Missing Supabase configuration", request_id: requestId }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
    });

    const rawBody = await req.json().catch(() => ({}));


    // Fuzzy key matching — query params win so the shell can post the anchor on the URL.
    const userId = url.searchParams.get("user_id") || rawBody.user_id || rawBody.userId || rawBody.config?.user_id;
    const acaHash =
      url.searchParams.get("aca_hash_key") || rawBody.aca_hash_key || rawBody.aca_hash || rawBody.acaHash;
    const syncSessionId = rawBody.sync_session_id || url.searchParams.get("sync_session_id") || null;

    // Broad extraction: Supports both the structured object and the raw Firehose array
    let healthData =
      rawBody.data ||
      rawBody.apple_health_data ||
      rawBody.healthData ||
      rawBody.health_data ||
      rawBody.samples ||
      rawBody.records ||
      rawBody.config?.apple_health_data ||
      rawBody.config?.healthData ||
      rawBody.config?.health_data;

    // Root-level check for flat structures
    if (
      !healthData ||
      (typeof healthData === "object" && !Array.isArray(healthData) && Object.keys(healthData).length === 0)
    ) {
      const allKnownKeys = [...Object.keys(healthKitKeyMapping), ...Object.values(healthKitKeyMapping)];
      const rootHealthData: Record<string, any> = {};
      for (const key of Object.keys(rawBody)) {
        if (allKnownKeys.includes(key)) rootHealthData[key] = rawBody[key];
      }
      if (Object.keys(rootHealthData).length > 0) healthData = rootHealthData;
    }

    console.log(
      `[AHS ${requestId}] body_keys=${JSON.stringify(Object.keys(rawBody))} user=${userId ? "yes" : "no"} aca=${
        acaHash ? "yes" : "no"
      } payload=${
        Array.isArray(healthData)
          ? healthData.length + " firehose records"
          : healthData
            ? Object.keys(healthData).length + " grouped keys"
            : "null"
      }`,
    );

    if (!userId) {
      console.log(
        `🚨 [EDGE_PAYLOAD_FATAL][FATAL: Planck.Edge.AppleHealthSync] Missing user_id in payload.`,
      );
      console.log(
        `🚨 [EDGE_PAYLOAD_FATAL][END: Planck.Edge.AppleHealthSync] -> Silent stalling occurs: Rejecting malformed Swift payload.`,
      );
      console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);
      return json({ success: false, error: "Missing required field: user_id", request_id: requestId, sync_session_id: syncSessionId }, 400);
    }
    if (!acaHash) {
      console.log(
        `🚨 [EDGE_PAYLOAD_FATAL][FATAL: Planck.Edge.AppleHealthSync] Missing ACA Hash in payload.`,
      );
      console.log(
        `🚨 [EDGE_PAYLOAD_FATAL][END: Planck.Edge.AppleHealthSync] -> Silent stalling occurs: Rejecting malformed Swift payload.`,
      );
      console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);
      return json(
        {
          success: false,
          error: "Missing required field: aca_hash_key. DELT Protocol requires a valid audit anchor.",
          request_id: requestId,
          sync_session_id: syncSessionId,
        },
        400,
      );
    }
    if (!healthData) {
      console.log(
        `🚨 [EDGE_PAYLOAD_FATAL][FATAL: Planck.Edge.AppleHealthSync] Missing health data payload (expected 'data' or 'healthData').`,
      );
      console.log(
        `🚨 [EDGE_PAYLOAD_FATAL][END: Planck.Edge.AppleHealthSync] -> Silent stalling occurs: Rejecting malformed Swift payload.`,
      );
      console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);
      return json(
        {
          success: false,
          error: "Missing required field: data. Payload must include health records.",
          request_id: requestId,
          sync_session_id: syncSessionId,
        },
        400,
      );
    }



    console.log(
      `🚨 [EDGE_PROCESS][ACTION: Planck.Edge.AppleHealthSync] Ingesting ${
        Array.isArray(healthData) ? healthData.length : healthData ? Object.keys(healthData).length : 0
      } records for ACA: ${acaHash}`,
    );


    // DELT/ACA Verification — match the anchor first, then confirm lineage when a profile exists.
    const { data: acaRecord, error: acaErr } = await supabase
      .from("user_aca_records")
      .select("id, platform_guid")
      .eq("aca_hash_key", acaHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (acaErr) console.error(`[AHS ${requestId}] aca lookup error`, acaErr);

    if (!acaRecord) {
      return json(
        {
          success: false,
          error: "DELT Protocol Verification Failed: no consent artifact matches this aca_hash_key.",
          request_id: requestId,
          sync_session_id: syncSessionId,
        },
        403,
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_guid")
      .eq("user_id", userId)
      .maybeSingle();

    const platformGuid = profile?.platform_guid ?? null;
    if (platformGuid && acaRecord.platform_guid && platformGuid !== acaRecord.platform_guid) {
      return json(
        {
          success: false,
          error: "DELT Protocol Verification Failed: consent artifact belongs to a different platform_guid.",
          request_id: requestId,
          sync_session_id: syncSessionId,
        },
        403,
      );
    }

    console.log(`[AHS ${requestId}] ✅ DELT verified for user ${userId}`);

    // Normalize incoming payload keys
    const processableData: Record<string, any> = {};
    if (healthData && typeof healthData === "object" && !Array.isArray(healthData)) {
      for (const key of Object.keys(healthData)) {
        processableData[healthKitKeyMapping[key] || key] = healthData[key];
      }
    }

    const recordsToInsert: any[] = [];
    let skipped = 0;

    // --- CASE 1: NATIVE FIREHOSE ARRAY ---
    if (Array.isArray(healthData)) {
      for (const item of healthData) {
        const rawType = item?.dataType || item?.type || item?.typeIdentifier;
        const dataType = healthKitKeyMapping[rawType] || rawType;
        if (!healthDataTypes.includes(dataType)) {
          skipped++;
          continue;
        }
        const actualValue = typeof item === "object" && item !== null && item.value !== undefined ? item.value : item;
        const parsedSteps = dataType === "steps" ? parseInt(String(actualValue)) : NaN;

        recordsToInsert.push({
          user_id: userId,
          aca_hash_key: acaHash,
          device_type: "Apple Health",
          raw_payload: {
            dataType,
            value: actualValue,
            metadata: item?.metadata || {},
            src_v: item?.metadata?.src_v || "Native-PureAlpha",
          },
          recorded_at: item?.startDate || item?.date || new Date().toISOString(),
          processing_status: "pending",
          processed: false,
          step_count: Number.isNaN(parsedSteps) ? null : parsedSteps,
        });
      }
    }
    // --- CASE 2: STRUCTURED OBJECT (LEGACY/WEB/BRIDGE) ---
    else {
      for (const key of Object.keys(processableData)) {
        if (!healthDataTypes.includes(key)) {
          skipped++;
          continue;
        }
        const value = processableData[key];
        if (value === null || value === undefined) continue;
        const dataArray = Array.isArray(value) ? value : [value];

        for (const record of dataArray) {
          const isObj = typeof record === "object" && record !== null;
          const actualValue = isObj && record.value !== undefined ? record.value : record;
          const parsedSteps = key === "steps" ? parseInt(String(actualValue)) : NaN;

          recordsToInsert.push({
            user_id: userId,
            aca_hash_key: acaHash,
            device_type: "Apple Health",
            raw_payload: {
              dataType: key,
              value: actualValue,
              unit: isObj ? record.unit || null : null,
              startDate: isObj ? record.startDate || record.date || null : null,
              endDate: isObj ? record.endDate || record.date || null : null,
              sourceBundle: (isObj && record.sourceBundle) || "com.apple.health",
              sourceName: (isObj && record.sourceName) || "Apple Health",
              metadata: (isObj && record.metadata) || {},
              originalRecord: isObj ? record : { value: actualValue },
            },
            recorded_at: (isObj && (record.startDate || record.date)) || new Date().toISOString(),
            processing_status: "pending",
            processed: false,
            step_count: Number.isNaN(parsedSteps) ? null : parsedSteps,
          });
        }
      }
    }

    // Workouts keep their own shape
    if (Array.isArray(processableData.workouts)) {
      for (const workout of processableData.workouts) {
        recordsToInsert.push({
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
          recorded_at: workout.startDate || new Date().toISOString(),
          processing_status: "pending",
          processed: false,
        });
      }
    }

    // Stamp the connection ledger FIRST so the client's watcher can resolve even on a thin payload.
    const payloadSource = String(rawBody.source || rawBody.config?.source || "apple_health").toLowerCase();
    const isHealthConnect = payloadSource.includes("health_connect") || payloadSource.includes("android");
    const connectionType = isHealthConnect ? "health_connect" : "apple_health";
    const connectionName = isHealthConnect ? "Health Connect" : "Apple Health";
    const nowIso = new Date().toISOString();

    try {
      const { data: existingConn } = await supabase
        .from("data_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("connection_type", connectionType)
        .limit(1)
        .maybeSingle();

      if (existingConn?.id) {
        const { error: updErr } = await supabase
          .from("data_connections")
          .update({
            connection_name: connectionName,
            is_active: true,
            last_sync_at: nowIso,
            last_successful_sync: nowIso,
            sync_status: "healthy",
            updated_at: nowIso,
          })
          .eq("id", existingConn.id);
        if (updErr) console.error(`[AHS ${requestId}] data_connections update failed`, updErr);
      } else {
        const { error: insErr } = await supabase.from("data_connections").insert({
          user_id: userId,
          connection_type: connectionType,
          connection_name: connectionName,
          is_active: true,
          last_sync_at: nowIso,
          last_successful_sync: nowIso,
          sync_status: "healthy",
        });
        if (insErr) console.error(`[AHS ${requestId}] data_connections insert failed`, insErr);
      }
    } catch (connErr) {
      console.error(`[AHS ${requestId}] data_connections ledger exception`, connErr);
    }

    if (recordsToInsert.length === 0) {
      console.log(`[AHS ${requestId}] no actionable records (skipped=${skipped})`);
      console.log(
        `🚨 [EDGE_SUCCESS][END: Planck.Edge.AppleHealthSync] -> Silent stalling prevented: Returning 200 OK to Swift master.`,
      );
      console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);
      return json({
        success: true,
        message: "Connection anchored — no actionable health data in this payload",
        processed_count: 0,
        skipped,
        request_id: requestId,
        sync_session_id: syncSessionId,
      });
    }

    // CHUNKED BATCH INSERT — no per-chunk select round trip, chunks issued in small parallel waves
    const CHUNK_SIZE = 250;
    const WAVE = 4;
    const chunks: any[][] = [];
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      chunks.push(recordsToInsert.slice(i, i + CHUNK_SIZE));
    }

    let inserted = 0;
    const failures: string[] = [];

    for (let i = 0; i < chunks.length; i += WAVE) {
      const wave = chunks.slice(i, i + WAVE);
      const results = await Promise.all(
        wave.map(async (chunk) => {
          const { error } = await supabase.from("raw_health_data").insert(chunk);
          if (error) {
            console.error(`[AHS ${requestId}] chunk insert error`, error.message);
            return { ok: false, count: 0, message: error.message };
          }
          return { ok: true, count: chunk.length, message: "" };
        }),
      );
      for (const r of results) {
        inserted += r.count;
        if (!r.ok && failures.length < 3) failures.push(r.message);
      }
    }

    console.log(
      `[AHS ${requestId}] ✅ ingested ${inserted}/${recordsToInsert.length} records (skipped=${skipped}) anchor=${acaHash.substring(0, 12)}`,
    );
    console.log(
      `🚨 [EDGE_SUCCESS][END: Planck.Edge.AppleHealthSync] -> Silent stalling prevented: Returning 200 OK to Swift master.`,
    );
    console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);

    return json({
      success: true,
      message: "Apple Health data synced successfully via IDIA Protocol",
      processed_count: inserted,
      received_count: recordsToInsert.length,
      skipped,
      errors: failures,
      delt_anchor: acaHash.substring(0, 12),
      request_id: requestId,
      sync_session_id: syncSessionId,
      sync_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[AHS ${requestId}] 🚨 fatal:`, message);
    console.log(
      `🚨 [EDGE_CATCH_FATAL][FATAL: Planck.Edge.AppleHealthSync] Exception caught during ingestion: ${message}`,
    );
    console.log(
      `🚨 [EDGE_CATCH_FATAL][END: Planck.Edge.AppleHealthSync] -> Silent stalling occurs: Returning 500 error to Swift master.`,
    );
    console.log(`--- END ERROR HANDLING: Edge Function POST Handler ---`);
    return json({ success: false, error: message, request_id: requestId }, 500);
  }

});
