// ══════════════════════════════════════════════════════════════════════
// DATA-SOURCE-REFRESH — one scheduled sweep for every connected source.
//
//   pg_cron (0 */6 * * *) -> data-source-refresh
//       nest           -> nest-sync            (Google SDM REST pull)
//       ford           -> ford-vehicle-data    (FordConnect REST pull)
//       strava         -> ingest-strava-data   ({ pull: true })
//       apple_health   -> device wake request  (readings live on the phone)
//       health_connect -> device wake request
//
// No simulated data anywhere: an empty upstream response is recorded as an
// empty sync. Every step logs an explicit BEGIN and END so a stall is always
// attributable.
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

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const PER_CONNECTION_TIMEOUT_MS = 45_000;
const CONCURRENCY = 4;

const PULL_DISPATCH: Record<string, { fn: string; body: (userId: string) => Record<string, unknown> }> = {
  nest: { fn: "nest-sync", body: (user_id) => ({ user_id, trigger: "scheduled_refresh" }) },
  ford: { fn: "ford-vehicle-data", body: (user_id) => ({ user_id }) },
  strava: { fn: "ingest-strava-data", body: (user_id) => ({ pull: true, user_id }) },
};

const DEVICE_SOURCES = new Set(["apple_health", "health_connect"]);

interface Connection {
  id: string;
  user_id: string;
  connection_type: string;
  last_successful_sync: string | null;
  sync_failure_count: number | null;
}

type Outcome = {
  connection_id: string;
  connection_type: string;
  result: "refreshed" | "wake_requested" | "stale_no_device" | "skipped" | "failed";
  reason?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Apple Health / Health Connect readings can only be read by the phone.
 * Ask the device to wake and upload; if no delivery channel or no device
 * token exists, mark the connection stale so the Data screen stays honest.
 */
async function requestDeviceWake(
  supabase: SupabaseClient,
  connection: Connection,
): Promise<Outcome> {
  const stale = !connection.last_successful_sync
    || Date.now() - new Date(connection.last_successful_sync).getTime() > SIX_HOURS_MS;

  if (!stale) {
    console.info(`[INFO: refresh.Device] ${connection.connection_type} user=${connection.user_id} fresh, no wake needed`);
    return { connection_id: connection.id, connection_type: connection.connection_type, result: "skipped", reason: "fresh" };
  }

  console.info(`[BEGIN: refresh.DeviceWake] ${connection.connection_type} user=${connection.user_id}`);

  const { data: tokens, error: tokenError } = await supabase
    .from("push_tokens")
    .select("token, platform")
    .eq("user_id", connection.user_id);

  if (tokenError) {
    console.error(`[ERROR: refresh.DeviceWake] token lookup failed: ${tokenError.message}`);
  }

  const fcmServiceAccount = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  const deliverable = (tokens?.length ?? 0) > 0 && !!fcmServiceAccount;

  await supabase
    .from("data_connections")
    .update({ sync_status: "stale", last_sync_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (!deliverable) {
    const reason = !tokens?.length ? "no_registered_device" : "no_push_credentials";
    console.warn(`[END: refresh.DeviceWake] ${connection.connection_type} user=${connection.user_id} marked stale (${reason})`);
    return { connection_id: connection.id, connection_type: connection.connection_type, result: "stale_no_device", reason };
  }

  let delivered = 0;
  try {
    const accessToken = await getGoogleAccessToken(fcmServiceAccount!);
    const projectId = JSON.parse(fcmServiceAccount!).project_id;

    for (const row of tokens!) {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: row.token,
            data: { type: "health_sync_request", source: connection.connection_type },
            apns: { headers: { "apns-push-type": "background", "apns-priority": "5" }, payload: { aps: { "content-available": 1 } } },
            android: { priority: "high" },
          },
        }),
      });
      if (res.ok) delivered += 1;
      else console.error(`[ERROR: refresh.DeviceWake] fcm status=${res.status} body=${await res.text().catch(() => "")}`);
    }
  } catch (error) {
    console.error(`[ERROR: refresh.DeviceWake] ${(error as Error).message}`);
  }

  console.info(`[END: refresh.DeviceWake] ${connection.connection_type} user=${connection.user_id} delivered=${delivered}`);
  return delivered > 0
    ? { connection_id: connection.id, connection_type: connection.connection_type, result: "wake_requested" }
    : { connection_id: connection.id, connection_type: connection.connection_type, result: "stale_no_device", reason: "delivery_failed" };
}

/** Minimal service-account JWT -> OAuth access token exchange for FCM v1. */
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${b64(header)}.${b64(claim)}`;

  const pem = (sa.private_key as string).replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }).toString(),
  });
  if (!res.ok) throw new Error(`google token exchange failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function refreshOne(supabase: SupabaseClient, connection: Connection): Promise<Outcome> {
  const type = connection.connection_type;

  if (DEVICE_SOURCES.has(type)) {
    return await requestDeviceWake(supabase, connection);
  }

  const dispatch = PULL_DISPATCH[type];
  if (!dispatch) {
    console.info(`[INFO: refresh.Dispatch] no scheduled puller for '${type}', skipping`);
    return { connection_id: connection.id, connection_type: type, result: "skipped", reason: "no_puller" };
  }

  console.info(`[BEGIN: refresh.Pull] ${type} user=${connection.user_id} -> ${dispatch.fn}`);
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke(dispatch.fn, { body: dispatch.body(connection.user_id) }),
      PER_CONNECTION_TIMEOUT_MS,
      `${dispatch.fn} for ${connection.user_id}`,
    );

    if (error) {
      console.error(`[ERROR: refresh.Pull] ${type} user=${connection.user_id} ${error.message}`);
      await supabase
        .from("data_connections")
        .update({
          sync_status: "error",
          last_sync_at: new Date().toISOString(),
          sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
        })
        .eq("id", connection.id);
      return { connection_id: connection.id, connection_type: type, result: "failed", reason: error.message };
    }

    console.info(`[END: refresh.Pull] ${type} user=${connection.user_id} result=${JSON.stringify(data)?.slice(0, 200)}`);
    return { connection_id: connection.id, connection_type: type, result: "refreshed" };
  } catch (error) {
    const message = (error as Error).message;
    console.error(`[ERROR: refresh.Pull] ${type} user=${connection.user_id} ${message}`);
    await supabase
      .from("data_connections")
      .update({
        sync_status: "error",
        last_sync_at: new Date().toISOString(),
        sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
      })
      .eq("id", connection.id);
    return { connection_id: connection.id, connection_type: type, result: "failed", reason: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  console.info("[START-EXECUTION: data-source-refresh]");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* scheduled call may have no body */ }

    const filterType = typeof body.connection_type === "string" ? body.connection_type : null;
    const respectFreshness = body.respect_freshness === undefined ? true : body.respect_freshness !== false;

    // ── Caller identity: scheduled cron (service role) vs signed-in client ──
    const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim() ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = !!serviceRoleKey && token === serviceRoleKey;

    let filterUser: string | null = null;
    if (isServiceRole) {
      console.info("[TRACE: refresh.Auth] service role invocation (cron/batch)");
      filterUser = typeof body.user_id === "string" ? body.user_id : null;
    } else {
      console.info("[TRACE: refresh.Auth] validating client bearer token");
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData?.user) {
        console.error(`[ERROR-HALT: refresh.Auth] unauthorized: ${authError?.message ?? "no user"}`);
        return json({ error: "unauthorized" }, 401);
      }
      // Strict isolation: a client can only ever refresh its own connections.
      filterUser = userData.user.id;
      console.info(`[TRACE: refresh.Auth] verified client request for user=${filterUser}`);
    }

    console.info(`[BEGIN: refresh.LoadConnections] type=${filterType ?? "all"} user=${filterUser ?? "all"} respect_freshness=${respectFreshness}`);
    let query = supabase
      .from("data_connections")
      .select("id, user_id, connection_type, last_successful_sync, sync_failure_count")
      .eq("is_active", true);
    if (filterType) query = query.eq("connection_type", filterType);
    if (filterUser) query = query.eq("user_id", filterUser);
    if (respectFreshness) {
      const cutoff = new Date(Date.now() - SIX_HOURS_MS).toISOString();
      console.info(`[TRACE: refresh.LoadConnections] freshness cutoff=${cutoff}`);
      query = query.or(`last_successful_sync.is.null,last_successful_sync.lt.${cutoff}`);
    }

    const { data: connections, error } = await query;
    if (error) {
      console.error(`[ERROR-HALT: refresh.LoadConnections] ${error.message}`);
      return json({ error: "load_connections_failed", detail: error.message }, 500);
    }

    const list = (connections ?? []) as Connection[];
    console.info(`[END: refresh.LoadConnections] connections=${list.length}`);

    const outcomes: Outcome[] = [];
    for (let i = 0; i < list.length; i += CONCURRENCY) {
      const batch = list.slice(i, i + CONCURRENCY);
      console.info(`[BEGIN: refresh.Batch] offset=${i} size=${batch.length}`);
      const settled = await Promise.all(batch.map((c) => refreshOne(supabase, c)));
      outcomes.push(...settled);
      console.info(`[END: refresh.Batch] offset=${i}`);
    }

    const summary = outcomes.reduce<Record<string, number>>((acc, o) => {
      acc[o.result] = (acc[o.result] ?? 0) + 1;
      return acc;
    }, {});

    console.info(`[END-EXECUTION: data-source-refresh] connections=${list.length} summary=${JSON.stringify(summary)} ms=${Date.now() - started}`);
    return json({ success: true, connections: list.length, summary, outcomes });
  } catch (error) {
    console.error(`[CRITICAL-SYSTEM: data-source-refresh] ${(error as Error)?.message ?? error}`);
    return json({ error: "unexpected_error" }, 500);
  }
});
