import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REDIRECT_URI = "https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/ford-oauth-callback";

// Ford has moved this endpoint before. Try the documented B2C endpoint first,
// then the FordConnect public host, so a single Ford-side move cannot silently
// break the link again.
const TOKEN_ENDPOINTS = [
  "https://dah2vb2cprod.b2clogin.com/914d88b1-3523-4bf6-9be4-1b96b4f6f919/oauth2/v2.0/token?p=B2C_1A_signup_signin_common",
  "https://fordconnect.cv.ford.com/fcon-public/v1/oauth/token",
  "https://fordconnect.cv.ford.com/fcon-public/v1/auth/token",
];

const NATIVE_SCHEME = "idialife://ford-callback";
const WEB_APP_URL = "https://idia-life-ui.lovable.app/";

function resultPage(opts: { ok: boolean; title: string; message: string }) {
  const color = opts.ok ? "#1351d8" : "#b3261e";
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.title}</title>
    <style>
      body { font-family: -apple-system, Arial, sans-serif; text-align: center; padding: 48px 24px; background: #f8f9fa; }
      .title { color: ${color}; font-size: 22px; font-weight: 700; margin-bottom: 12px; }
      .message { color: #555; font-size: 15px; line-height: 1.4; }
      .logo { font-size: 44px; margin-bottom: 14px; }
      a.btn { display: inline-block; margin-top: 24px; padding: 12px 22px; border-radius: 10px; background: ${color}; color: #fff; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="logo">🚙</div>
    <div class="title">${opts.title}</div>
    <div class="message">${opts.message}</div>
    <a class="btn" href="${WEB_APP_URL}">Return to IDIA</a>
    <script>
      (function () {
        try { window.location.href = ${JSON.stringify(NATIVE_SCHEME)}; } catch (e) {}
        setTimeout(function () {
          try { if (window.opener) { window.close(); return; } } catch (e) {}
          window.location.replace(${JSON.stringify(WEB_APP_URL)});
        }, 1800);
      })();
    </script>
  </body>
</html>`;
}

async function exchangeCodeForToken(clientId: string, clientSecret: string, code: string) {
  const attempts: string[] = [];

  for (const endpoint of TOKEN_ENDPOINTS) {
    console.log(`[BEGIN: Ford.TokenExchange] endpoint=${endpoint}`);
    try {
      const response = await fetch(endpoint, {
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
      console.log(
        `[END: Ford.TokenExchange] endpoint=${endpoint} status=${response.status} body=${bodyText.substring(0, 500)}`,
      );

      if (response.ok) {
        try {
          return { tokenData: JSON.parse(bodyText), endpoint, attempts };
        } catch (parseError) {
          attempts.push(`${endpoint} -> 200 but unparsable body`);
          console.error(`[ERROR: Ford.TokenExchange] Unparsable body from ${endpoint}`, parseError);
          continue;
        }
      }

      attempts.push(`${endpoint} -> ${response.status}`);
    } catch (error) {
      attempts.push(`${endpoint} -> network error`);
      console.error(`[ERROR: Ford.TokenExchange] Request failed for ${endpoint}`, error);
    }
  }

  return { tokenData: null, endpoint: null, attempts };
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
    let state = url.searchParams.get("state"); // user_id
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
      return new Response(
        resultPage({ ok: false, title: "Ford sign-in failed", message: `Ford reported: ${error}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    }

    if (!code || !state) {
      return new Response(
        resultPage({
          ok: false,
          title: "Ford link incomplete",
          message: "Ford did not return an authorization code. Please try connecting again.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    }

    const clientId = Deno.env.get("FORD_CLIENT_ID");
    const clientSecret = Deno.env.get("FORD_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("[ERROR: Ford.Callback] Missing FORD_CLIENT_ID / FORD_CLIENT_SECRET");
      return new Response(
        resultPage({
          ok: false,
          title: "Ford link failed",
          message: "Ford API credentials are not configured on the server.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    }

    const { tokenData, endpoint, attempts } = await exchangeCodeForToken(clientId, clientSecret, code);

    if (!tokenData?.access_token) {
      console.error(`[ERROR: Ford.Callback] All token endpoints failed: ${attempts.join(" | ")}`);
      return new Response(
        resultPage({
          ok: false,
          title: "Ford link failed",
          message: `Ford accepted your sign-in but rejected the token request (${attempts.join(", ")}). Please try again.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    }

    console.log(`[INFO: Ford.Callback] Token obtained via ${endpoint}`);

    // Store the connection (UPDATE-then-INSERT, never upsert)
    const { data: existingRows, error: selectError } = await supabase
      .from("data_connections")
      .select("id")
      .eq("user_id", state)
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
      is_active: true,
      last_sync_at: new Date().toISOString(),
    };

    const writeError = existingRows && existingRows.length > 0
      ? (await supabase.from("data_connections").update(connectionRow).eq("id", existingRows[0].id)).error
      : (await supabase.from("data_connections").insert({
          user_id: state,
          connection_type: "ford",
          ...connectionRow,
        })).error;

    if (writeError) {
      console.error("[ERROR: Ford.Callback] Failed to store Ford connection:", writeError);
      return new Response(
        resultPage({
          ok: false,
          title: "Ford link failed",
          message: "We could not save your Ford connection. Please try again.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    }

    console.log("[INFO: Ford.Callback] Connection activated. Triggering first telemetry pull.");

    // Pull the first telemetry batch immediately. A failure here must not undo
    // the successful link.
    try {
      const { data: pullData, error: pullError } = await supabase.functions.invoke("ford-vehicle-data", {
        body: { user_id: state },
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

    return new Response(
      resultPage({
        ok: true,
        title: "FordConnect linked successfully",
        message: "Vehicle telemetry is now streaming. Returning you to IDIA…",
      }),
      { headers: { ...corsHeaders, "Content-Type": "text/html" } },
    );
  } catch (error) {
    console.error("[FATAL: Ford.Callback]", error, (error as Error)?.stack);
    return new Response(
      resultPage({
        ok: false,
        title: "Ford link failed",
        message: "An unexpected error occurred. Please try connecting again.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
    );
  }
});
