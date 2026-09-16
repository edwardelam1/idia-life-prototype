// ══════════════════════════════════════════════════════════════════════
// NEST CONTROLLER
// Builds the Google Smart Device Management (Device Access) consent URL.
// Mirrors strava-controller: base64 state carrying the user id and a
// sanitized return URL so the web flow lands back on the page it started.
// ══════════════════════════════════════════════════════════════════════
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

const ALLOWED_RETURN_HOSTS = ["thebigidia.com", "lovable.app", "lovableproject.com", "localhost"];

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

function getAuthUrl(userId: string, returnUrlRaw: unknown) {
  console.info("[BEGIN: nest-controller.getAuthUrl]");
  if (!userId) {
    console.error("[ERROR: nest-controller.getAuthUrl] missing user id");
    return json({ error: "User ID is required" }, 400);
  }

  const clientId = Deno.env.get("NEST_CLIENT_ID");
  const projectId = Deno.env.get("NEST_PROJECT_ID");
  if (!clientId) return json({ error: "Nest client ID not configured" }, 500);
  if (!projectId) return json({ error: "Nest Device Access project ID not configured" }, 500);

  const redirectUri =
    Deno.env.get("NEST_REDIRECT_URI") ||
    "https://auth.thebigidia.com/functions/v1/nest-oauth-callback";

  const returnUrl = sanitizeReturnUrl(returnUrlRaw);
  const state = encodeState(userId, returnUrl);

  // Device Access requires the Partner Connections Manager URL, not the bare
  // Google OAuth endpoint — this is what lets the person pick which devices to share.
  const oauthUrl =
    `https://nestservices.google.com/partnerconnections/${encodeURIComponent(projectId)}/auth` +
    `?redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&access_type=offline&prompt=consent&include_granted_scopes=true` +
    `&client_id=${encodeURIComponent(clientId)}&response_type=code` +
    `&scope=${encodeURIComponent("https://www.googleapis.com/auth/sdm.service")}` +
    `&state=${encodeURIComponent(state)}`;

  console.info(
    `[END: nest-controller.getAuthUrl] redirect_uri=${redirectUri} return=${returnUrl ?? "deeplink"}`,
  );
  return json({ oauthUrl });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, returnUrl } = body ?? {};
    console.info(`[NEST_CONTROLLER] action=${action} userId=${userId ? "present" : "missing"}`);

    switch (action) {
      case "get-auth-url":
        return getAuthUrl(userId, returnUrl);
      default:
        return json({ error: `Unknown action: ${action ?? "(none)"}` }, 400);
    }
  } catch (err) {
    console.error("[NEST_CONTROLLER][ERROR]", err);
    return json({ error: "Internal server error" }, 500);
  }
});
