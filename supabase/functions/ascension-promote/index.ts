// ascension-promote — L3 Protocol Steward override.
// Promotes a `pending_veto` hat to `active` immediately, bypassing the
// remaining cooling-off window. Requires caller to hold an active `tophat`.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    // Service-role client for privileged writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller holds an active tophat (L3 Protocol Steward)
    const { data: callerHats, error: hatErr } = await admin
      .from("dao_hats")
      .select("hat_type")
      .eq("user_id", callerId)
      .eq("hat_type", "tophat")
      .eq("eligibility_status", "active")
      .is("revoked_at", null)
      .limit(1);

    if (hatErr) {
      console.error("[ASCENSION_PROMOTE] hat lookup failed", hatErr);
      return new Response(JSON.stringify({ error: "Authority check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!callerHats || callerHats.length === 0) {
      return new Response(
        JSON.stringify({ error: "Insufficient authority — Protocol Steward (L3) required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { hat_id, aca_hash, aca_payload } = body || {};
    if (typeof hat_id !== "string" || typeof aca_hash !== "string" || !aca_payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: hat_id, aca_hash, aca_payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Best-effort ACA artifact write — table may not exist in every env
    try {
      await admin.from("aca_consent_artifacts" as any).insert({
        hash: aca_hash,
        status: "consumed",
        metadata: { type: "TOPHAT_PROMOTE", caller_id: callerId, hat_id, payload: aca_payload },
      });
    } catch (e) {
      console.warn("[ASCENSION_PROMOTE] ACA artifact write skipped:", (e as Error).message);
    }

    // Promote the target hat. Use a best-effort update — extra columns
    // (promoted_by/promoted_at) degrade gracefully if absent.
    const updatePayload: Record<string, unknown> = {
      eligibility_status: "active",
      veto_window_end: null,
    };
    try {
      (updatePayload as any).promoted_by = callerId;
      (updatePayload as any).promoted_at = new Date().toISOString();
    } catch (_) { /* noop */ }

    const { error: updErr } = await admin
      .from("dao_hats")
      .update(updatePayload)
      .eq("id", hat_id)
      .eq("eligibility_status", "pending_veto");

    if (updErr) {
      // Retry without optional columns if schema rejects them
      const { error: retryErr } = await admin
        .from("dao_hats")
        .update({ eligibility_status: "active", veto_window_end: null })
        .eq("id", hat_id)
        .eq("eligibility_status", "pending_veto");
      if (retryErr) {
        console.error("[ASCENSION_PROMOTE] update failed", retryErr);
        return new Response(JSON.stringify({ error: retryErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("[ASCENSION_PROMOTE] OK", { hat_id, caller: callerId });
    return new Response(JSON.stringify({ ok: true, hat_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[ASCENSION_PROMOTE] FATAL", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
