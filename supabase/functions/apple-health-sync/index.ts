// Canonical ingestion path: apple-health-sync → raw_health_data → (trigger) → staged_health_data → best-friend-ai
//
// Response contract: this function ACKNOWLEDGES fast and finishes the heavy
// insert work in the background (EdgeRuntime.waitUntil). A full HealthKit
// firehose can exceed the isolate's wall-clock budget if the response waits on
// every chunk — that is what left the native shell spinning forever even though
// the rows landed in staged_health_data.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

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
};

// EXPANDED WHITELIST: The complete Discovery Set from Swift
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

const CHUNK_SIZE = 250;
const CONCURRENCY = 4;

/** Background writer — runs AFTER the response has been flushed. */
async function drainInserts(supabase: any, records: any[], reqId: string) {
  console.log(`[BEGIN: Edge.ChunkedInsert] ${reqId} draining ${records.length} records.`);
  let inserted = 0;
  let rejected = 0;

  const chunks: any[][] = [];
  for (let i = 0; i < records.length; i += CHUNK_SIZE) chunks.push(records.slice(i, i + CHUNK_SIZE));

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((chunk) => supabase.from("raw_health_data").insert(chunk)),
    );
    results.forEach((r, idx) => {
      const size = batch[idx].length;
      if (r.status === "rejected") {
        rejected += size;
        console.error(`🚨 [FATAL: Edge.Chunk_${i + idx}] ${reqId} threw:`, r.reason);
        return;
      }
      const err = (r.value as any)?.error;
      if (err) {
        rejected += size;
        console.error(`🚨 [ERROR: Edge.Chunk_${i + idx}] ${reqId} Supabase rejection:`, err);
        return;
      }
      inserted += size;
      console.log(`[END: Edge.Chunk_${i + idx}] ${reqId} inserted ${size} rows.`);
    });
  }

  console.log(`[END: Edge.ChunkedInsert] ${reqId} inserted=${inserted} rejected=${rejected}.`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqId = crypto.randomUUID().substring(0, 8);
  const url = new URL(req.url);

  // Reachability probe — no DB, no auth, no payload.
  if (url.searchParams.get("ping") === "1") {
    console.log(`[PING: Edge.Execution] ${reqId} reachability probe.`);
    return reply({ ok: true, request_id: reqId, ts: new Date().toISOString() });
  }

  console.log(
    `[BEGIN: Edge.Execution] ${reqId} method=${req.method} len=${req.headers.get("content-length") ?? "?"} headers=${[
      ...req.headers.keys(),
    ].join(",")}`,
  );

  try {
    console.log(`[BEGIN: Edge.EnvVerification] ${reqId}`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
    });
    console.log(`[END: Edge.EnvVerification] ${reqId} client instantiated.`);

    // Granular parse — never swallow OOM / malformed payloads behind .catch(() => ({}))
    console.log(`[BEGIN: Edge.RequestParse] ${reqId}`);
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch (parseErr) {
      console.error(`🚨 [FATAL: Edge.RequestParse] ${reqId} payload unreadable:`, parseErr);
      return reply(
        {
          success: false,
          request_id: reqId,
          error: "Invalid or excessively large JSON payload.",
        },
        400,
      );
    }
    console.log(`[END: Edge.RequestParse] ${reqId} keys=${Object.keys(rawBody || {}).join(",")}`);

    console.log(`[BEGIN: Edge.DataExtraction] ${reqId}`);
    const userId = rawBody.user_id || rawBody.userId || rawBody.config?.user_id || url.searchParams.get("user_id");
    const acaHash =
      url.searchParams.get("aca_hash_key") || rawBody.aca_hash_key || rawBody.aca_hash || rawBody.acaHash;

    let healthData =
      rawBody.data ||
      rawBody.apple_health_data ||
      rawBody.healthData ||
      rawBody.health_data ||
      rawBody.samples ||
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

    const receivedCount = Array.isArray(healthData)
      ? healthData.length
      : healthData && typeof healthData === "object"
        ? Object.keys(healthData).length
        : 0;
    console.log(
      `[END: Edge.DataExtraction] ${reqId} shape=${Array.isArray(healthData) ? "firehose" : healthData ? "object" : "null"} received=${receivedCount}`,
    );

    if (!userId) {
      console.error(`🚨 [FATAL: Edge.Validation] ${reqId} user_id missing.`);
      return reply({ success: false, request_id: reqId, error: "Missing required field: user_id" }, 400);
    }

    if (!acaHash) {
      console.error(`🚨 [FATAL: Edge.Validation] ${reqId} aca_hash_key missing.`);
      return reply(
        {
          success: false,
          request_id: reqId,
          error: "Missing required field: aca_hash_key. DELT Protocol requires a valid audit anchor.",
        },
        400,
      );
    }

    // ── DELT / ACA verification ───────────────────────────────────────────────
    console.log(`[BEGIN: Edge.DELT_Verify] ${reqId} resolving platform_guid.`);
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("platform_guid")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) console.error(`🚨 [ERROR: Edge.DELT_Verify.Profile] ${reqId}`, profileErr);

    const platformGuid = profile?.platform_guid;
    if (!platformGuid) {
      console.error(`🚨 [FATAL: Edge.DELT_Verify] ${reqId} no platform_guid for user ${userId}.`);
      return reply({ success: false, request_id: reqId, error: "No profile/platform_guid found for user" }, 403);
    }

    console.log(`[BEGIN: Edge.DELT_Verify.ACA] ${reqId} hash=${String(acaHash).substring(0, 12)}…`);
    const { data: acaRecord, error: acaErr } = await supabase
      .from("user_aca_records")
      .select("id, platform_guid")
      .eq("aca_hash_key", acaHash)
      .maybeSingle();
    if (acaErr) console.error(`🚨 [ERROR: Edge.DELT_Verify.ACA] ${reqId}`, acaErr);

    if (!acaRecord) {
      console.error(`🚨 [FATAL: Edge.DELT_Verify.ACA] ${reqId} no audit record for this hash.`);
      return reply(
        {
          success: false,
          request_id: reqId,
          error: "DELT Protocol Verification Failed: no audit record matches this consent hash.",
        },
        403,
      );
    }
    if (acaRecord.platform_guid && String(acaRecord.platform_guid) !== String(platformGuid)) {
      console.error(`🚨 [FATAL: Edge.DELT_Verify.ACA] ${reqId} platform_guid mismatch on audit record.`);
      return reply(
        {
          success: false,
          request_id: reqId,
          error: "DELT Protocol Verification Failed: consent artifact belongs to a different platform identity.",
        },
        403,
      );
    }
    console.log(`[END: Edge.DELT_Verify] ${reqId} DELT cleared.`);

    // ── Normalize + build rows ────────────────────────────────────────────────
    console.log(`[BEGIN: Edge.DataTransformation] ${reqId}`);
    const processableData: Record<string, any> = {};
    if (healthData && typeof healthData === "object" && !Array.isArray(healthData)) {
      for (const key of Object.keys(healthData)) {
        processableData[healthKitKeyMapping[key] || key] = healthData[key];
      }
    }

    const recordsToInsert: any[] = [];
    let skipped = 0;

    // CASE 1: native firehose array
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
    // CASE 2: structured object (legacy / web)
    else {
      for (const dataType of healthDataTypes) {
        if (processableData[dataType] === undefined || processableData[dataType] === null) continue;
        const dataArray = Array.isArray(processableData[dataType])
          ? processableData[dataType]
          : [processableData[dataType]];

        for (const record of dataArray) {
          const isObj = typeof record === "object" && record !== null;
          const actualValue = isObj && record.value !== undefined ? record.value : record;

          const healthRecord: any = {
            user_id: userId,
            aca_hash_key: acaHash,
            device_type: "Apple Health",
            raw_payload: {
              dataType,
              value: actualValue,
              unit: isObj ? record.unit || null : null,
              startDate: isObj ? record.startDate || record.date : null,
              endDate: isObj ? record.endDate || record.date : null,
              sourceBundle: isObj ? record.sourceBundle || "com.apple.health" : "com.apple.health",
              sourceName: isObj ? record.sourceName || "Apple Health" : "Apple Health",
              metadata: isObj ? record.metadata || {} : {},
              originalRecord: isObj ? record : { value: actualValue },
            },
            recorded_at: (isObj ? record.startDate || record.date : null) || new Date().toISOString(),
            processing_status: "pending",
            processed: false,
          };

          if (dataType === "steps" && actualValue !== undefined && actualValue !== null) {
            const parsed = parseInt(String(actualValue));
            if (!Number.isNaN(parsed)) healthRecord.step_count = parsed;
          }

          recordsToInsert.push(healthRecord);
        }
      }
    }

    // Workouts keep their original shape
    if (processableData.workouts && Array.isArray(processableData.workouts)) {
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

    console.log(
      `[END: Edge.DataTransformation] ${reqId} accepted=${recordsToInsert.length} skipped=${skipped} received=${receivedCount}`,
    );

    if (recordsToInsert.length === 0) {
      console.log(`[ACTION: Edge.EarlyExit] ${reqId} nothing actionable.`);
      return reply({
        success: true,
        request_id: reqId,
        message: "No actionable health data found",
        received_count: receivedCount,
        accepted: 0,
        skipped,
        processed_count: 0,
      });
    }

    // Stamp the connection BEFORE the heavy write so the app's realtime/poll
    // watcher on data_connections can close the modal even if the client
    // dropped the HTTP response.
    console.log(`[BEGIN: Edge.StatusUpsert] ${reqId}`);
    const payloadSource = String(rawBody.source || rawBody.config?.source || "apple_health").toLowerCase();
    const isHealthConnect = payloadSource.includes("health_connect") || payloadSource.includes("android");
    const { error: connError } = await supabase.from("data_connections").upsert(
      {
        user_id: userId,
        connection_type: isHealthConnect ? "health_connect" : "apple_health",
        connection_name: isHealthConnect ? "Health Connect" : "Apple Health",
        is_active: true,
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connection_type" },
    );
    if (connError) console.error(`🚨 [ERROR: Edge.StatusUpsert] ${reqId}`, connError);
    console.log(`[END: Edge.StatusUpsert] ${reqId}`);

    // Acknowledge now; drain in the background.
    const drain = drainInserts(supabase, recordsToInsert, reqId).catch((e) =>
      console.error(`🚨 [FATAL: Edge.ChunkedInsert] ${reqId} drain failed:`, e?.stack || e),
    );
    try {
      // @ts-ignore — EdgeRuntime is provided by supabase edge-runtime
      EdgeRuntime.waitUntil(drain);
    } catch {
      // Local/dev runtimes without EdgeRuntime: the promise still resolves in-isolate.
    }

    console.log(`[END: Edge.Execution] ${reqId} acknowledged ${recordsToInsert.length} records.`);
    return reply({
      success: true,
      request_id: reqId,
      message: "Apple Health data accepted via IDIA Protocol",
      received_count: receivedCount,
      accepted: recordsToInsert.length,
      skipped,
      // Legacy field the native shell reads for its success banner.
      processed_count: recordsToInsert.length,
      processed_data: [],
      delt_anchor: String(acaHash).substring(0, 12),
      sync_timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const detail = error?.stack || error?.message || String(error);
    console.error(`🚨 [FATAL: Edge.Execution.Unhandled] ${reqId} stalled:`, detail);
    return reply({ success: false, request_id: reqId, error: error?.message || String(error) }, 500);
  }
});
