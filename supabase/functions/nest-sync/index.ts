// ══════════════════════════════════════════════════════════════════════
// NEST SYNC — lifestyle pipeline
//
//   Nest SDM API
//     -> raw_app_data                (raw_source='nest', aca_hash_key)
//     -> lifestyle_processing_queue  (pending -> processing -> completed/failed)
//     -> staged_lifestyle_data       (user_id, aca_hash_key, quality score)
//
// Health tables are NEVER touched by this function.
// No simulated readings: an empty SDM response records an empty sync.
// ══════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface NestDevice {
  name?: string;
  type?: string;
  traits?: Record<string, Record<string, unknown>>;
  parentRelations?: Array<{ parent?: string; displayName?: string }>;
}

/** Strip every Google-side identifier; only the trait readings survive. */
function anonymizeDevice(device: NestDevice) {
  const traits = device.traits ?? {};
  const shortType = (device.type ?? "sdm.devices.types.UNKNOWN").split(".").pop() ?? "UNKNOWN";

  const climate = {
    hvac_status: traits["sdm.devices.traits.ThermostatHvac"]?.["status"] ?? null,
    thermostat_mode: traits["sdm.devices.traits.ThermostatMode"]?.["mode"] ?? null,
    eco_mode: traits["sdm.devices.traits.ThermostatEco"]?.["mode"] ?? null,
    ambient_temperature_c:
      traits["sdm.devices.traits.Temperature"]?.["ambientTemperatureCelsius"] ?? null,
    ambient_humidity_percent:
      traits["sdm.devices.traits.Humidity"]?.["ambientHumidityPercent"] ?? null,
    setpoint:
      traits["sdm.devices.traits.ThermostatTemperatureSetpoint"] ?? null,
    fan: traits["sdm.devices.traits.Fan"]?.["timerMode"] ?? null,
    connectivity: traits["sdm.devices.traits.Connectivity"]?.["status"] ?? null,
  };

  return {
    device_class: shortType,
    room_label: device.parentRelations?.[0]?.displayName ?? null,
    climate,
    available_traits: Object.keys(traits),
  };
}

/** Quality = share of the climate readings that actually came back populated. */
function qualityScore(payload: ReturnType<typeof anonymizeDevice>) {
  const values = Object.values(payload.climate);
  if (values.length === 0) return 0;
  const present = values.filter((v) => v !== null && v !== undefined).length;
  return Number((present / values.length).toFixed(2));
}

async function refreshAccessToken(
  supabase: SupabaseClient,
  connection: Record<string, any>,
): Promise<string | null> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 120_000 && connection.access_token) {
    console.info("[INFO: nest-sync.Token] Existing access token still valid.");
    return connection.access_token;
  }

  console.info("[BEGIN: nest-sync.TokenRefresh]");
  if (!connection.refresh_token) {
    console.error("[ERROR: nest-sync.TokenRefresh] No refresh token stored — reconnect required.");
    return null;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("NEST_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("NEST_CLIENT_SECRET") ?? "",
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[ERROR: nest-sync.TokenRefresh] status=${res.status} body=${detail}`);
    return null;
  }

  const data = await res.json();
  const expiresIn = Number(data?.expires_in ?? 3600);
  await supabase
    .from("data_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    })
    .eq("id", connection.id);

  console.info("[END: nest-sync.TokenRefresh] token refreshed.");
  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  console.info("[BEGIN: nest-sync] invoked");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[FATAL: nest-sync] Missing database credentials.");
      return json({ error: "server_configuration" }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.user_id;
    if (!userId) {
      console.error("[ERROR: nest-sync] user_id is required.");
      return json({ error: "user_id is required" }, 400);
    }

    const projectId = Deno.env.get("NEST_PROJECT_ID");
    if (!projectId) {
      console.error("[FATAL: nest-sync] NEST_PROJECT_ID not configured.");
      return json({ error: "server_configuration" }, 500);
    }

    // ── 1. Connection ────────────────────────────────────────────────
    console.info(`[BEGIN: nest-sync.LoadConnection] user=${userId}`);
    const { data: connections, error: connError } = await supabase
      .from("data_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("connection_type", "nest")
      .eq("is_active", true)
      .limit(1);

    if (connError) {
      console.error(`[ERROR: nest-sync.LoadConnection] ${connError.message}`);
      return json({ error: "connection_lookup_failed" }, 500);
    }
    const connection = connections?.[0];
    if (!connection) {
      console.error("[ERROR: nest-sync.LoadConnection] No active Nest connection.");
      return json({ error: "no_active_connection" }, 404);
    }
    console.info("[END: nest-sync.LoadConnection]");

    // ── 2. Consent artifact (mandatory) ──────────────────────────────
    console.info("[BEGIN: nest-sync.ResolveACA]");
    const { data: acaRows, error: acaError } = await supabase
      .from("user_aca_records")
      .select("aca_hash_key, created_at")
      .eq("platform_guid", userId)
      .eq("source_id", "nest")
      .order("created_at", { ascending: false })
      .limit(1);

    if (acaError) {
      console.error(`[ERROR: nest-sync.ResolveACA] ${acaError.message}`);
      return json({ error: "aca_lookup_failed" }, 500);
    }
    const acaHash = acaRows?.[0]?.aca_hash_key;
    if (!acaHash) {
      console.error("[ERROR: nest-sync.ResolveACA] No consent artifact for Nest — refusing ingest.");
      return json({ error: "missing_consent_artifact" }, 403);
    }
    console.info(`[END: nest-sync.ResolveACA] hash=${acaHash.substring(0, 8)}…`);

    // ── 3. Access token ──────────────────────────────────────────────
    const accessToken = await refreshAccessToken(supabase, connection);
    if (!accessToken) {
      await supabase
        .from("data_connections")
        .update({
          sync_status: "auth_expired",
          sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
        })
        .eq("id", connection.id);
      return json({ error: "token_refresh_failed" }, 401);
    }

    // ── 4. Device pull ───────────────────────────────────────────────
    console.info("[BEGIN: nest-sync.FetchDevices]");
    const sdmRes = await fetch(
      `https://smartdevicemanagement.googleapis.com/v1/enterprises/${projectId}/devices`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!sdmRes.ok) {
      const detail = await sdmRes.text().catch(() => "");
      console.error(`[ERROR: nest-sync.FetchDevices] status=${sdmRes.status} body=${detail}`);
      await supabase
        .from("data_connections")
        .update({
          sync_status: "error",
          sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
        })
        .eq("id", connection.id);
      return json({ error: "sdm_fetch_failed", status: sdmRes.status }, 502);
    }

    const sdmData = await sdmRes.json();
    const devices: NestDevice[] = Array.isArray(sdmData?.devices) ? sdmData.devices : [];
    console.info(`[END: nest-sync.FetchDevices] devices=${devices.length}`);

    if (devices.length === 0) {
      console.info("[INFO: nest-sync] No devices returned — recording an empty sync, no data fabricated.");
      await supabase
        .from("data_connections")
        .update({
          sync_status: "ok",
          last_sync_at: new Date().toISOString(),
          last_successful_sync: new Date().toISOString(),
          sync_failure_count: 0,
        })
        .eq("id", connection.id);
      return json({ success: true, devices: 0, staged: 0 });
    }

    // ── 5. raw_app_data -> queue -> staged_lifestyle_data ────────────
    let stagedCount = 0;

    for (const device of devices) {
      const payload = anonymizeDevice(device);
      const quality = qualityScore(payload);
      const eventType = `nest_${payload.device_class.toLowerCase()}_snapshot`;

      console.info(`[BEGIN: nest-sync.Ingest] class=${payload.device_class} quality=${quality}`);

      const { data: rawRow, error: rawError } = await supabase
        .from("raw_app_data")
        .insert({
          pseudo_user_id: userId,
          data_category: "lifestyle",
          event_type: eventType,
          anonymized_payload: payload,
          telemetry_payload: payload.climate,
          raw_source: "nest",
          aca_hash_key: acaHash,
          data_quality_score: quality,
          session_context: { trigger: body?.trigger ?? "manual", device_class: payload.device_class },
        })
        .select("id")
        .single();

      if (rawError || !rawRow) {
        console.error(`[ERROR: nest-sync.Ingest.Raw] ${rawError?.message ?? "no row returned"}`);
        continue;
      }
      console.info(`[INFO: nest-sync.Ingest.Raw] raw_app_data=${rawRow.id}`);

      const { data: queueRow, error: queueError } = await supabase
        .from("lifestyle_processing_queue")
        .insert({
          raw_app_data_id: rawRow.id,
          source: "nest",
          data_category: "lifestyle",
          processing_status: "processing",
          processing_stage: "anonymization",
        })
        .select("id")
        .single();

      if (queueError || !queueRow) {
        console.error(`[ERROR: nest-sync.Ingest.Queue] ${queueError?.message ?? "no row returned"}`);
        continue;
      }
      console.info(`[INFO: nest-sync.Ingest.Queue] queue=${queueRow.id}`);

      const { error: stagedError } = await supabase.from("staged_lifestyle_data").insert({
        entity_id: rawRow.id,
        user_id: userId,
        pseudo_user_id: userId,
        aca_hash_key: acaHash,
        event_type: eventType,
        event_category: "lifestyle",
        data_quality_score: quality,
        synapse_weight_coefficient: Number((quality * 0.75).toFixed(4)),
        reward_amount: 0,
        reward_calculated: false,
      });

      if (stagedError) {
        console.error(`[ERROR: nest-sync.Ingest.Staged] ${stagedError.message}`);
        await supabase
          .from("lifestyle_processing_queue")
          .update({
            processing_status: "failed",
            processing_stage: "staging",
            error_details: { message: stagedError.message },
            updated_at: new Date().toISOString(),
          })
          .eq("id", queueRow.id);
        continue;
      }

      await supabase
        .from("lifestyle_processing_queue")
        .update({
          processing_status: "completed",
          processing_stage: "staged",
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueRow.id);

      stagedCount += 1;
      console.info(`[END: nest-sync.Ingest] staged ok for ${payload.device_class}`);
    }

    await supabase
      .from("data_connections")
      .update({
        sync_status: "ok",
        last_sync_at: new Date().toISOString(),
        last_successful_sync: new Date().toISOString(),
        sync_failure_count: 0,
      })
      .eq("id", connection.id);

    console.info(`[END: nest-sync] devices=${devices.length} staged=${stagedCount} ms=${Date.now() - started}`);
    return json({ success: true, devices: devices.length, staged: stagedCount });
  } catch (error: unknown) {
    console.error(`[FATAL: nest-sync] ${(error as Error)?.message ?? error}`);
    return json({ error: "unexpected_error" }, 500);
  }
});
