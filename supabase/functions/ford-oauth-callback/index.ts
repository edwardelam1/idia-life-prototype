import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REDIRECT_URI = "https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/ford-oauth-callback";
const TOKEN_ENDPOINT = "https://api.vehicle.ford.com/dah2vb2cprod.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_FCON_AUTHORIZE";

function redirectToApp(status: "success" | "error", reason?: string) {
  const destination = new URL("idialife://ford-callback");
  destination.searchParams.set("status", status);
  if (reason) destination.searchParams.set("reason", reason.substring(0, 120));
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: destination.toString() } });
}

async function exchangeCodeForToken(clientId: string, clientSecret: string, code: string) {
  console.log(`[BEGIN: Ford.TokenExchange] endpoint=${TOKEN_ENDPOINT}`);
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });
  const bodyText = await response.text();
  console.log(`[END: Ford.TokenExchange] status=${response.status} body=${bodyText.substring(0, 500)}`);
  if (!response.ok) return null;
  try {
    return JSON.parse(bodyText);
  } catch (parseError) {
    console.error("[ERROR: Ford.TokenExchange] Unparsable token response", parseError);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);

    let code = url.searchParams.get("code");
    let state = url.searchParams.get("state");
    let error = url.searchParams.get("error");

    if (req.method === "POST") {
      try {
        const formData = await req.formData();
        code = code || formData.get("code")?.toString() || null;
        state = state || formData.get("state")?.toString() || null;
        error = error || formData.get("error")?.toString() || null;
      } catch (e) {
        console.warn("[WARN: Ford.Callback] Could not parse form data", e);
      }
    }

    console.log(
      `[BEGIN: Ford.Callback] method=${req.method} hasCode=${!!code} hasState=${!!state} error=${error ?? "none"}`,
    );

    if (error) {
      console.error("[ERROR: Ford.Callback] Ford OAuth error:", error);
      return redirectToApp("error", error);
    }

    if (!code || !state) {
      const allParams = Array.from(url.searchParams.entries())
        .map(([k, v]) => `${k}=${v.substring(0, 80)}`)
        .join("&");
      console.error(
        `[ERROR: Ford.Callback] Bounce with no code/state. params=${allParams || "(none)"} referer=${req.headers.get("referer") ?? "none"}`,
      );
      return redirectToApp("error", "missing_oauth_response");
    }

    const { data: stateRows, error: stateReadError } = await supabase
      .from("ford_oauth_states")
      .select("user_id, expires_at")
      .eq("state", state)
      .limit(1);
    const oauthState = stateRows?.[0];

    if (stateReadError || !oauthState || new Date(oauthState.expires_at) <= new Date()) {
      console.error("[ERROR: Ford.Callback] Invalid or expired OAuth state", stateReadError ?? "state_not_found");
      if (oauthState) await supabase.from("ford_oauth_states").delete().eq("state", state);
      return redirectToApp("error", "invalid_oauth_state");
    }

    const { error: stateDeleteError } = await supabase.from("ford_oauth_states").delete().eq("state", state);
    if (stateDeleteError) {
      console.error("[ERROR: Ford.Callback] Could not consume OAuth state", stateDeleteError);
      return redirectToApp("error", "oauth_state_not_consumed");
    }
    const userId = oauthState.user_id;

    const clientId = Deno.env.get("FORD_CLIENT_ID");
    const clientSecret = Deno.env.get("FORD_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("[ERROR: Ford.Callback] Missing FORD_CLIENT_ID / FORD_CLIENT_SECRET");
      return redirectToApp("error", "server_configuration");
    }

    const tokenData = await exchangeCodeForToken(clientId, clientSecret, code);

    if (!tokenData?.access_token) {
      console.error("[ERROR: Ford.Callback] Ford token exchange failed");
      return redirectToApp("error", "token_exchange_failed");
    }

    console.log("[INFO: Ford.Callback] FordConnect Query token obtained");

    // Store the connection (UPDATE-then-INSERT, never upsert)
    const { data: existingRows, error: selectError } = await supabase
      .from("data_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("connection_type", "ford")
      .limit(1);

    if (selectError) {
      console.error("[ERROR: Ford.Callback] Select failed:", selectError);
    }

    const connectionRow = {
      connection_name: "FordConnect",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      is_active: false,
    };

    const writeError = existingRows && existingRows.length > 0
      ? (await supabase.from("data_connections").update(connectionRow).eq("id", existingRows[0].id)).error
      : (await supabase.from("data_connections").insert({
          user_id: userId,
          connection_type: "ford",
          ...connectionRow,
        })).error;

    if (writeError) {
      console.error("[ERROR: Ford.Callback] Failed to store Ford connection:", writeError);
      return redirectToApp("error", "connection_store_failed");
    }

    console.log("[INFO: Ford.Callback] Credentials stored. Triggering first telemetry pull.");

    // Pull the first telemetry batch immediately. A failure here must not undo
    // the successful link.
    try {
      const { data: pullData, error: pullError } = await supabase.functions.invoke("ford-vehicle-data", {
        body: { user_id: userId },
      });
      if (pullError) {
        console.error("[ERROR: Ford.Callback] ford-vehicle-data invoke failed:", pullError);
      } else {
        console.log("[INFO: Ford.Callback] ford-vehicle-data result:", JSON.stringify(pullData)?.substring(0, 400));
      }
    } catch (pullThrow) {
      console.error("[ERROR: Ford.Callback] ford-vehicle-data threw:", pullThrow);
    }

    console.log("[END: Ford.Callback] Success.");

    return redirectToApp("success");
  } catch (error) {
    console.error("[FATAL: Ford.Callback]", error, (error as Error)?.stack);
    return redirectToApp("error", "unexpected_error");
  }
});
