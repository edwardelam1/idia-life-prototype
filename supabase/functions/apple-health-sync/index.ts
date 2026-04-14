// IDIA Protocol: Apple Health Sync (DELT-Verified)
// Canonical ingestion path: apple-health-sync → raw_health_data → (trigger) → idia-synapse → anonymization-processor → staged_health_data → process-staged-data → credit-user-wallet
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
    });

    const rawBody = await req.json().catch(() => ({}));

    // Fuzzy key matching
    const userId = rawBody.user_id || rawBody.userId || rawBody.config?.user_id;
    const healthData = rawBody.apple_health_data || rawBody.healthData || rawBody.config?.apple_health_data;
    const acaHash = rawBody.aca_hash || rawBody.acaHash;
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

    // Handle automated sync with no health data
    if ((automatedSync || forceRealDataOnly) && (!healthData || (typeof healthData === "object" && Object.keys(healthData).length === 0))) {
      return new Response(JSON.stringify({ success: true, message: "No new health data available for sync", processed_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!healthData) {
      return new Response(JSON.stringify({ success: false, error: "Missing required field: apple_health_data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter simulated data for automated syncs
    let processableData = healthData;
    if (automatedSync || forceRealDataOnly) {
      const filteredData: Record<string, unknown[]> = {};
      Object.keys(healthData).forEach((dataType: string) => {
        if (Array.isArray(healthData[dataType])) {
          const realOnly = healthData[dataType].filter((item: any) => {
            return !(item.simulated === true || item.metadata?.simulated === true || (typeof item.value === "object" && item.value?.simulated === true));
          });
          if (realOnly.length > 0) filteredData[dataType] = realOnly;
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

    // Process health data into raw_health_data (the canonical table)
    const processedData: any[] = [];
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
      try {
        const dataArray = Array.isArray(processableData[dataType]) ? processableData[dataType] : [processableData[dataType]];
        for (const record of dataArray) {
          const healthRecord: any = {
            user_id: userId,
            device_type: "Apple Health",
            raw_payload: {
              dataType,
              value: record.value || record,
              unit: record.unit || null,
              startDate: record.startDate || record.date,
              endDate: record.endDate || record.date,
              sourceBundle: record.sourceBundle || "com.apple.health",
              sourceName: record.sourceName || "Apple Health",
              metadata: record.metadata || {},
              originalRecord: record,
            },
            recorded_at: record.startDate || record.date || new Date().toISOString(),
            processing_status: "pending",
            processed: false,
          };

          if (dataType === "steps" && record.value) {
            healthRecord.step_count = parseInt(record.value);
          }

          const { data: rawData, error: rawError } = await supabase
            .from("raw_health_data")
            .insert(healthRecord)
            .select("id")
            .single();

          if (!rawError && rawData) {
            processedData.push({
              type: dataType,
              id: rawData.id,
              value: record.value,
              recordedAt: record.startDate || record.date,
            });
          } else {
            console.error(`Error inserting ${dataType}:`, rawError);
          }
        }
      } catch (error) {
        console.error(`Error processing ${dataType}:`, error);
      }
    }

    // Process workouts
    if (processableData.workouts && Array.isArray(processableData.workouts)) {
      for (const workout of processableData.workouts) {
        try {
          const { data: rawData, error: rawError } = await supabase
            .from("raw_health_data")
            .insert({
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
            })
            .select("id")
            .single();

          if (!rawError && rawData) {
            processedData.push({
              type: "workout",
              id: rawData.id,
              activityType: workout.workoutActivityType,
              duration: workout.duration,
            });
          }
        } catch (error) {
          console.error("Error processing workout:", error);
        }
      }
    }

    console.log(`✅ Processed ${processedData.length} health records with DELT anchor: ${acaHash.substring(0, 12)}...`);
    // raw_health_data INSERT triggers idia-synapse → anonymization-processor → staged_health_data → process-staged-data → credit-user-wallet
    // The pipeline is fully automated via DB triggers

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
