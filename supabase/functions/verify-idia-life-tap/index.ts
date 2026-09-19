// verify-idia-life-tap
// Anchors a sovereign consent (ACA) signature against a pending LIDD extraction
// event and moves it out of `pending_consent`. Strict caller isolation: the
// event must belong to the authenticated user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_RE = /^[0-9a-f]{64}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log("🛡️ [BEGIN: verify-idia-life-tap] Consent anchoring request received.");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── AUTH ──────────────────────────────────────────────────────────────
    console.log("🛡️ [BEGIN: AUTH] Validating caller token.");
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      console.error("🚨 [FAIL: AUTH] Missing bearer token.");
      return json({ error: "Authentication required." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error(`🚨 [FAIL: AUTH] Invalid token: ${userError?.message}`);
      return json({ error: "Invalid session. Please sign in again." }, 401);
    }
    const userId = userData.user.id;
    console.log(`🛡️ [END: AUTH] Caller verified: ${userId}`);

    // ── INPUT ─────────────────────────────────────────────────────────────
    console.log("🛡️ [BEGIN: VALIDATE_INPUT]");
    const body = await req.json().catch(() => ({}));
    const eventId = String(body?.event_id ?? "");
    const acaHash = String(body?.aca_hash_key ?? "");

    if (!UUID_RE.test(eventId)) {
      console.error("🚨 [FAIL: VALIDATE_INPUT] event_id is not a valid uuid.");
      return json({ error: "A valid event_id is required." }, 400);
    }
    if (!HASH_RE.test(acaHash)) {
      console.error("🚨 [FAIL: VALIDATE_INPUT] aca_hash_key is not a 64-char hex digest.");
      return json({ error: "A valid consent signature is required." }, 400);
    }
    console.log(`🛡️ [END: VALIDATE_INPUT] event=${eventId} hash=${acaHash.slice(0, 8)}…`);

    const admin = createClient(supabaseUrl, serviceKey);

    // ── LOAD EVENT ────────────────────────────────────────────────────────
    console.log("🛡️ [BEGIN: LOAD_EVENT]");
    const { data: event, error: loadError } = await admin
      .from("lidd_extraction_events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (loadError) {
      console.error(`🚨 [FAIL: LOAD_EVENT] ${loadError.message}`);
      return json({ error: "Could not read the extraction event." }, 500);
    }
    if (!event) {
      console.error("🚨 [FAIL: LOAD_EVENT] Event not found.");
      return json({ error: "This request no longer exists." }, 404);
    }
    if (event.citizen_guid !== userId) {
      console.error("🚨 [FAIL: LOAD_EVENT] Ownership mismatch — refusing.");
      return json({ error: "This request does not belong to you." }, 403);
    }
    if (event.payment_status !== "pending_consent") {
      console.log(`🛡️ [END: LOAD_EVENT] Already resolved (${event.payment_status}) — idempotent return.`);
      return json({ success: true, already_resolved: true, event });
    }
    console.log("🛡️ [END: LOAD_EVENT] Event is pending consent and owned by the caller.");

    // ── ANCHOR CONSENT ────────────────────────────────────────────────────
    console.log("🛡️ [BEGIN: ANCHOR_CONSENT] Writing consent artifact to the event.");
    const { data: updated, error: updateError } = await admin
      .from("lidd_extraction_events")
      .update({ aca_hash_key: acaHash, payment_status: "consented" })
      .eq("id", eventId)
      .eq("citizen_guid", userId)
      .eq("payment_status", "pending_consent")
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error(`🚨 [FAIL: ANCHOR_CONSENT] ${updateError.message}`);
      return json({ error: `Consent could not be recorded: ${updateError.message}` }, 500);
    }
    if (!updated) {
      console.error("🚨 [FAIL: ANCHOR_CONSENT] No row updated — state changed concurrently.");
      return json({ error: "Consent could not be recorded. Please refresh and retry." }, 409);
    }

    console.log(`🛡️ [END: ANCHOR_CONSENT] Event ${eventId} → ${updated.payment_status}`);
    console.log("🛡️ [END: verify-idia-life-tap] SUCCESS.");
    return json({ success: true, event: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`🚨 [FAIL: verify-idia-life-tap] ${message}`);
    return json({ error: message }, 500);
  }
});
