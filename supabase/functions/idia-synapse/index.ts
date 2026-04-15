import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HealthKit identifier → internal key mapping
const HEALTHKIT_KEY_MAP: Record<string, string> = {
  "HKQuantityTypeIdentifierStepCount": "steps",
  "HKQuantityTypeIdentifierDistanceWalkingRunning": "distance",
  "HKQuantityTypeIdentifierDistanceCycling": "distance_cycling",
  "HKQuantityTypeIdentifierFlightsClimbed": "flights_climbed",
  "HKQuantityTypeIdentifierActiveEnergyBurned": "calories",
  "HKQuantityTypeIdentifierBasalEnergyBurned": "basal_calories",
  "HKQuantityTypeIdentifierAppleExerciseTime": "exercise_time",
  "HKQuantityTypeIdentifierHeartRate": "heartRate",
  "HKQuantityTypeIdentifierRestingHeartRate": "resting_heartrate",
  "HKQuantityTypeIdentifierOxygenSaturation": "blood_oxygen",
  "HKQuantityTypeIdentifierRespiratoryRate": "respiratory_rate",
  "HKQuantityTypeIdentifierVO2Max": "vo2max",
  "HKQuantityTypeIdentifierHeight": "height",
  "HKQuantityTypeIdentifierBodyMass": "weight",
  "HKQuantityTypeIdentifierBodyMassIndex": "bmi",
  "HKQuantityTypeIdentifierBodyFatPercentage": "body_fat",
  "HKQuantityTypeIdentifierDietaryEnergyConsumed": "dietary_energy",
  "HKCategoryTypeIdentifierMindfulSession": "mindful_minutes",
  "HKWorkoutTypeIdentifier": "workout",
};

function extractValue(record: unknown): number {
  if (record === null || record === undefined) return 0;
  if (typeof record === 'number') return record;
  if (typeof record === 'string') return parseFloat(record) || 0;
  if (typeof record === 'object' && record !== null) {
    const obj = record as Record<string, unknown>;
    if (obj.value !== undefined) return extractValue(obj.value);
    if (obj.quantity !== undefined) return extractValue(obj.quantity);
  }
  return 0;
}

function normalizeHealthPayload(rawPayload: Record<string, unknown>): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawPayload)) {
    const mappedKey = HEALTHKIT_KEY_MAP[key] || key;
    if (Array.isArray(value)) {
      // Average for arrays (e.g. multiple heart rate samples)
      const values = value.map(extractValue).filter(v => v > 0);
      if (values.length > 0) {
        normalized[mappedKey] = mappedKey === 'steps' || mappedKey === 'calories'
          ? values.reduce((a, b) => a + b, 0) // Sum for cumulative
          : values.reduce((a, b) => a + b, 0) / values.length; // Average for rates
      }
    } else {
      const v = extractValue(value);
      if (v > 0 || mappedKey === 'steps') normalized[mappedKey] = v;
    }
  }
  return normalized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } }
    });

    const body = await req.json();
    console.log('IDIA-Synapse: Request received, keys:', Object.keys(body));

    // ================================================================
    // MODE A: DB Trigger Orchestration
    // ================================================================
    if (body.orchestration_mode && body.raw_data_id) {
      console.log('MODE A: Orchestrating raw_data_id:', body.raw_data_id);

      const { data: rawRecord, error: fetchError } = await supabaseAdmin
        .from('raw_health_data')
        .select('*')
        .eq('id', body.raw_data_id)
        .single();

      if (fetchError || !rawRecord) {
        console.error('Failed to fetch raw record:', fetchError);
        return new Response(JSON.stringify({ error: 'Raw data not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate pseudo_user_id for staged data
      const { data: pseudoResult } = await supabaseAdmin
        .rpc('generate_pseudonym', { input_text: rawRecord.user_id });
      const pseudoId = pseudoResult || 'unknown';

      // Normalize the raw payload
      const payload = rawRecord.raw_payload || {};
      const normalized = normalizeHealthPayload(payload);

      // Insert into staged_health_data with proper typed columns
      const { data: staged, error: stageError } = await supabaseAdmin
        .from('staged_health_data')
        .insert({
          pseudo_user_id: pseudoId,
          device_type: rawRecord.device_type || 'apple_health',
          activity_type: rawRecord.activity_type || 'health_tracking',
          steps_count: normalized.steps ? Math.round(normalized.steps) : rawRecord.step_count || null,
          average_heartrate: normalized.heartRate ? Math.round(normalized.heartRate) : null,
          distance_meters: normalized.distance || null,
          duration_seconds: normalized.exercise_time ? Math.round(normalized.exercise_time * 60) : null,
          calories_burned: normalized.calories ? Math.round(normalized.calories) : null,
          data_quality_score: 0.8,
          data_completeness_score: Math.min(1.0, Object.keys(normalized).length * 0.15 + 0.3),
          processed_at: new Date().toISOString(),
          reward_calculated: false,
        })
        .select()
        .single();

      if (stageError) {
        console.error('Staging failed:', stageError);
        // Still mark raw as processed to prevent infinite retries
      }

      // Mark raw record as processed
      await supabaseAdmin
        .from('raw_health_data')
        .update({
          processed: true,
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', rawRecord.id);

      // Fan-out: trigger reward processing if staged succeeded
      if (staged) {
        supabaseAdmin.functions.invoke('process-staged-data', {
          body: { staged_data_id: staged.id }
        }).catch(e => console.error('Reward fan-out failed:', e));
      }

      console.log('MODE A complete:', { raw_id: rawRecord.id, staged_id: staged?.id, normalized });

      return new Response(JSON.stringify({
        success: true,
        mode: 'orchestration',
        raw_data_id: rawRecord.id,
        staged_data_id: staged?.id,
        metrics: normalized,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ================================================================
    // MODE B: Direct App Ingestion (iOS Native Bridge)
    // ================================================================
    console.log('MODE B: Direct ingestion from iOS app');

    // Resolve user from auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth failed:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log('MODE B: User resolved:', userId);

    // Verify ACA hash if provided
    const url = new URL(req.url);
    const acaHash = url.searchParams.get('aca_hash') || body.aca_hash;
    if (acaHash) {
      const { data: acaRecord } = await supabaseAdmin
        .from('user_aca_records')
        .select('id')
        .eq('aca_hash_key', acaHash)
        .maybeSingle();

      if (!acaRecord) {
        console.warn('ACA hash not found, proceeding anyway:', acaHash);
      } else {
        console.log('ACA hash verified:', acaHash);
      }
    }

    // Normalize the incoming health data
    const normalized = normalizeHealthPayload(body);
    const stepCount = normalized.steps ? Math.round(normalized.steps) : (body.step_count || body.steps || 0);

    // Insert into raw_health_data (this triggers Mode A via safe_health_processing_trigger)
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('raw_health_data')
      .insert({
        user_id: userId,
        step_count: stepCount,
        raw_payload: body,
        device_type: body.device_type || 'apple_health',
        activity_type: body.activity_type || 'health_tracking',
        recorded_at: body.recorded_at || new Date().toISOString(),
        processed: false,
        processing_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert failed:', insertError);
      return new Response(JSON.stringify({ error: 'Data ingestion failed', details: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('MODE B: Inserted raw_health_data:', inserted.id);

    // Return summary to the iOS app for display
    return new Response(JSON.stringify({
      success: true,
      mode: 'direct_ingestion',
      processed_count: 1,
      steps: stepCount,
      heartRate: normalized.heartRate ? Math.round(normalized.heartRate) : null,
      calories: normalized.calories ? Math.round(normalized.calories) : null,
      raw_data_id: inserted.id,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('IDIA-Synapse error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
