// ══════════════════════════════════════════════════════════════════════
// STRAVA OAUTH CALLBACK
// Exchanges the authorization code, stores the connection with a strict
// select → insert/update flow (never an upsert), and redirects back into
// the app via the idialife:// deep link so the modal can close itself.
// ══════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_RETURN_HOSTS = ["thebigidia.com", "lovable.app", "lovableproject.com", "localhost"];

function sanitizeReturnUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    const host = parsed.hostname.toLowerCase();
    const ok = ALLOWED_RETURN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    return ok ? `${parsed.origin}${parsed.pathname}` : null;
  } catch {
    return null;
  }
}

/** state is either a bare user id (native deep-link flow) or `b64.<payload>` carrying a return URL. */
function decodeState(state: string | null): { userId: string | null; returnUrl: string | null } {
  if (!state) return { userId: null, returnUrl: null };
  if (!state.startsWith("b64.")) return { userId: state, returnUrl: null };
  try {
    const b64 = state.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    return { userId: parsed?.u ?? null, returnUrl: sanitizeReturnUrl(parsed?.r ?? null) };
  } catch {
    return { userId: null, returnUrl: null };
  }
}

function buildRedirect(returnUrl: string | null, status: "success" | "error", reason?: string) {
  const destination = returnUrl
    ? new URL(returnUrl)
    : new URL("idialife://strava-callback");
  destination.searchParams.set(returnUrl ? "strava" : "status", status);
  if (reason) destination.searchParams.set("reason", reason.substring(0, 120));
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: destination.toString() } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  console.info(`[BEGIN: strava-callback] invoked`);

  const url = new URL(req.url);
  const { userId: state, returnUrl } = decodeState(url.searchParams.get("state"));
  const redirectToApp = (status: "success" | "error", reason?: string) =>
    buildRedirect(returnUrl, status, reason);
  console.info(`[STATE] user=${state ? "present" : "missing"} return=${returnUrl ?? "deeplink"}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error(`[FATAL: strava-callback] Missing database credentials.`);
      return redirectToApp("error", "server_configuration");
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const code = url.searchParams.get("code");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      console.error(`[ERROR: strava-callback] Strava returned error=${oauthError}`);
      return redirectToApp("error", oauthError);
    }
    if (!code || !state) {
      console.error(`[ERROR: strava-callback] Missing code or state.`);
      return redirectToApp("error", "missing_oauth_response");
    }

    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      console.error(`[FATAL: strava-callback] STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET not configured.`);
      return redirectToApp("error", "server_configuration");
    }

    console.info(`[BEGIN: strava-callback.TokenExchange]`);
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => "");
      console.error(`[ERROR: strava-callback.TokenExchange] status=${tokenResponse.status} body=${detail}`);
      return redirectToApp("error", "token_exchange_failed");
    }

    const tokenData = await tokenResponse.json();
    console.info(`[END: strava-callback.TokenExchange] athlete=${tokenData?.athlete?.id ?? "unknown"}`);

    const connectionRow = {
      user_id: state,
      connection_type: "strava",
      connection_name: "Strava",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Number(tokenData.expires_at) * 1000).toISOString(),
      is_active: true,
      last_sync_at: new Date().toISOString(),
    };

    // Strict select → insert/update. No upserts.
    console.info(`[BEGIN: strava-callback.StoreConnection] user=${state}`);
    const { data: existing, error: selectError } = await supabase
      .from("data_connections")
      .select("id")
      .eq("user_id", state)
      .eq("connection_type", "strava")
      .limit(1);

    if (selectError) {
      console.error(`[ERROR: strava-callback.StoreConnection] select failed: ${selectError.message}`);
      return redirectToApp("error", "connection_store_failed");
    }

    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase.from("data_connections").insert(connectionRow);
      if (insertError) {
        console.error(`[ERROR: strava-callback.StoreConnection] insert failed: ${insertError.message}`);
        return redirectToApp("error", "connection_store_failed");
      }
    } else {
      const { error: updateError } = await supabase
        .from("data_connections")
        .update(connectionRow)
        .eq("id", existing[0].id);
      if (updateError) {
        console.error(`[ERROR: strava-callback.StoreConnection] update failed: ${updateError.message}`);
        return redirectToApp("error", "connection_store_failed");
      }
    }
    console.info(`[END: strava-callback.StoreConnection] connection active.`);

    // Webhook subscription is best-effort; a failure must not block the return.
    try {
      const { error: webhookError } = await supabase.functions.invoke("strava-webhook-subscription", {
        body: { action: "subscribe" },
      });
      if (webhookError) console.warn(`[WARNING: strava-callback.Webhook] ${webhookError.message}`);
    } catch (webhookErr: any) {
      console.warn(`[WARNING: strava-callback.Webhook] ${webhookErr?.message ?? webhookErr}`);
    }

    console.info(`[END: strava-callback] success ms=${Date.now() - started}`);
    return redirectToApp("success");
  } catch (error: any) {
    console.error(`[FATAL: strava-callback] ${error?.message ?? error}`);
    return redirectToApp("error", "unexpected_error");
  }
});
