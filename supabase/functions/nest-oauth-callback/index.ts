// ══════════════════════════════════════════════════════════════════════
// NEST OAUTH CALLBACK
// Exchanges the Device Access authorization code, stores the connection
// with a strict select → insert/update flow (never an upsert), kicks off
// the first sync, then redirects back into the app.
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
  const destination = returnUrl ? new URL(returnUrl) : new URL("idialife://nest-callback");
  destination.searchParams.set(returnUrl ? "nest" : "status", status);
  if (reason) destination.searchParams.set("reason", reason.substring(0, 120));
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: destination.toString() } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  console.info("[BEGIN: nest-callback] invoked");

  const url = new URL(req.url);
  const { userId: state, returnUrl } = decodeState(url.searchParams.get("state"));
  const redirectToApp = (status: "success" | "error", reason?: string) =>
    buildRedirect(returnUrl, status, reason);
  console.info(`[STATE] user=${state ? "present" : "missing"} return=${returnUrl ?? "deeplink"}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[FATAL: nest-callback] Missing database credentials.");
      return redirectToApp("error", "server_configuration");
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const code = url.searchParams.get("code");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      console.error(`[ERROR: nest-callback] Google returned error=${oauthError}`);
      return redirectToApp("error", oauthError);
    }
    if (!code || !state) {
      console.error("[ERROR: nest-callback] Missing code or state.");
      return redirectToApp("error", "missing_oauth_response");
    }

    const clientId = Deno.env.get("NEST_CLIENT_ID");
    const clientSecret = Deno.env.get("NEST_CLIENT_SECRET");
    const redirectUri =
      Deno.env.get("NEST_REDIRECT_URI") ||
      "https://auth.thebigidia.com/functions/v1/nest-oauth-callback";
    if (!clientId || !clientSecret) {
      console.error("[FATAL: nest-callback] NEST_CLIENT_ID/NEST_CLIENT_SECRET not configured.");
      return redirectToApp("error", "server_configuration");
    }

    console.info("[BEGIN: nest-callback.TokenExchange]");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => "");
      console.error(`[ERROR: nest-callback.TokenExchange] status=${tokenResponse.status} body=${detail}`);
      return redirectToApp("error", "token_exchange_failed");
    }

    const tokenData = await tokenResponse.json();
    console.info(`[END: nest-callback.TokenExchange] refresh_token=${tokenData?.refresh_token ? "yes" : "no"}`);

    const expiresIn = Number(tokenData?.expires_in ?? 3600);
    const connectionRow: Record<string, unknown> = {
      user_id: state,
      connection_type: "nest",
      connection_name: "Nest",
      access_token: tokenData.access_token,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      is_active: true,
      last_sync_at: new Date().toISOString(),
    };
    // Google only returns a refresh token on first consent — never blank an existing one.
    if (tokenData.refresh_token) connectionRow.refresh_token = tokenData.refresh_token;

    console.info(`[BEGIN: nest-callback.StoreConnection] user=${state}`);
    const { data: existing, error: selectError } = await supabase
      .from("data_connections")
      .select("id")
      .eq("user_id", state)
      .eq("connection_type", "nest")
      .limit(1);

    if (selectError) {
      console.error(`[ERROR: nest-callback.StoreConnection] select failed: ${selectError.message}`);
      return redirectToApp("error", "connection_store_failed");
    }

    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase.from("data_connections").insert(connectionRow);
      if (insertError) {
        console.error(`[ERROR: nest-callback.StoreConnection] insert failed: ${insertError.message}`);
        return redirectToApp("error", "connection_store_failed");
      }
    } else {
      const { error: updateError } = await supabase
        .from("data_connections")
        .update(connectionRow)
        .eq("id", existing[0].id);
      if (updateError) {
        console.error(`[ERROR: nest-callback.StoreConnection] update failed: ${updateError.message}`);
        return redirectToApp("error", "connection_store_failed");
      }
    }
    console.info("[END: nest-callback.StoreConnection] connection active.");

    // First pull is best-effort; a failure must not strand the person on a dead page.
    try {
      console.info("[BEGIN: nest-callback.InitialSync]");
      const { error: syncError } = await supabase.functions.invoke("nest-sync", {
        body: { user_id: state, trigger: "oauth_callback" },
      });
      if (syncError) console.warn(`[WARNING: nest-callback.InitialSync] ${syncError.message}`);
      console.info("[END: nest-callback.InitialSync]");
    } catch (syncErr: unknown) {
      console.warn(`[WARNING: nest-callback.InitialSync] ${(syncErr as Error)?.message ?? syncErr}`);
    }

    console.info(`[END: nest-callback] success ms=${Date.now() - started}`);
    return redirectToApp("success");
  } catch (error: unknown) {
    console.error(`[FATAL: nest-callback] ${(error as Error)?.message ?? error}`);
    return redirectToApp("error", "unexpected_error");
  }
});
