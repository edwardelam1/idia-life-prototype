import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_RETURN_HOSTS = [
  "thebigidia.com",
  "lovable.app",
  "lovableproject.com",
  "localhost",
];

function sanitizeReturnUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    const host = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_RETURN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    return allowed ? `${parsed.origin}${parsed.pathname}` : null;
  } catch {
    return null;
  }
}

function encodeState(userId: string, returnUrl: string | null) {
  if (!returnUrl) return userId;
  const payload = JSON.stringify({ u: userId, r: returnUrl });
  return `b64.${btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

async function getAuthUrl(userId: string, returnUrlRaw: unknown) {
  if (!userId) return json({ error: "User ID is required" }, 400);

  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  if (!clientId) return json({ error: "Strava client ID not configured" }, 500);

  // Must exactly match the "Authorization Callback Domain" configured on the Strava API app.
  const redirectUri =
    Deno.env.get("STRAVA_REDIRECT_URI") ||
    `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/strava-oauth-callback`;
  const returnUrl = sanitizeReturnUrl(returnUrlRaw);
  console.log(
    `[STRAVA_CONTROLLER] redirect_uri=${redirectUri} client_id=***${clientId.slice(-4)} return=${returnUrl ?? "deeplink"}`,
  );
  const scope = "read,activity:read_all";
  const oauthUrl =
    `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&approval_prompt=force&scope=${scope}&state=${encodeURIComponent(encodeState(userId, returnUrl))}`;

  return json({ oauthUrl });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, returnUrl } = body ?? {};

    console.log(`[STRAVA_CONTROLLER] action=${action} userId=${userId ? "present" : "missing"}`);

    switch (action) {
      case "get-auth-url":
        return await getAuthUrl(userId, returnUrl);
      default:
        return json({ error: `Unknown action: ${action ?? "(none)"}` }, 400);
    }
  } catch (err) {
    console.error("[STRAVA_CONTROLLER][ERROR]", err);
    return json({ error: "Internal server error" }, 500);
  }
});
