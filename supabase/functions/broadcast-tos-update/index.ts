import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { importPKCS8, SignJWT } from "npm:jose@5";
import { z } from "npm:zod@3";
import {
  appleEndpoint,
  appleFailureDiagnostic,
  appleReasonHint,
  mayBroadcast,
  permanentlyInvalid,
  REQUIRED_PUSH_ROLE,
  RETRYABLE_TEST_STATUSES,
  TERMS_CAMPAIGN,
  TEST_CAMPAIGN,
  termsPayload,
} from "./rules.ts";

const BodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview") }).strict(),
  z.object({ mode: z.literal("test"), device_id: z.string().uuid().optional() }).strict(),
  z
    .object({
      mode: z.literal("broadcast"),
      confirmation: z.literal("SEND_TERMS_UPDATE"),
      device_test_confirmed: z.literal(true),
      after_id: z.string().uuid().optional(),
    })
    .strict(),
]);

Deno.serve(async (req) => {
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  console.log("[APNS_TERMS][BEGIN]");

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return respond({ error: "Server configuration unavailable" }, 503);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return respond({ error: "Unauthorized" }, 401);

    const client = createClient(url, anon);
    const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return respond({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: role, error: roleError } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("role", REQUIRED_PUSH_ROLE)
      .maybeSingle();
    if (roleError || !role) return respond({ error: "Administrator access required" }, 403);

    let input: unknown;
    try {
      input = await req.json();
    } catch {
      return respond({ error: "Invalid request" }, 400);
    }
    const parsed = BodySchema.safeParse(input);
    if (!parsed.success) return respond({ error: "Invalid request parameters" }, 400);
    const body = parsed.data;

    const keyId = Deno.env.get("APNS_KEY_ID");
    const teamId = Deno.env.get("APNS_TEAM_ID");
    const bundleId = Deno.env.get("APNS_BUNDLE_ID");
    const privateKey = Deno.env.get("APNS_PRIVATE_KEY");
    const environment = Deno.env.get("APNS_ENVIRONMENT");

    if (!keyId || !teamId || !bundleId || !privateKey || !environment) {
      return respond({ error: "Apple settings are incomplete" }, 503);
    }

    const endpoint = appleEndpoint(environment);
    const { count, error: countError } = await admin
      .from("push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("platform", "ios");
    if (countError) return respond({ error: "Could not read device registrations" }, 500);
    if (body.mode === "preview") return respond({ campaign: TERMS_CAMPAIGN, ios_registrations: count, sending: false });

    if (body.mode === "broadcast") {
      const { data: test, error: testError } = await admin
        .from("push_campaign_deliveries")
        .select("id")
        .eq("campaign", TEST_CAMPAIGN)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      if (testError || !mayBroadcast(Boolean(test), body.device_test_confirmed)) {
        return respond(
          { error: "A successful single-iPhone test and display confirmation are required before broadcast" },
          409,
        );
      }
    }

    const signingKey = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "ES256");
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .sign(signingKey);

    let query = admin
      .from("push_tokens")
      .select("id,user_id,token,updated_at")
      .eq("platform", "ios")
      .order("id")
      .limit(body.mode === "test" ? 1 : 100);

    if (body.mode === "test") {
      query = query.eq("user_id", auth.user.id);
      if (body.device_id) query = query.eq("id", body.device_id);
    } else if (body.after_id) {
      query = query.gt("id", body.after_id);
    }

    const { data: devices, error: devicesError } = await query;
    if (devicesError) return respond({ error: "Could not read device registrations" }, 500);
    if (!devices?.length) return respond({ accepted: 0, failed: 0, skipped: 0, next_after_id: null, sending: false });

    const campaign = body.mode === "test" ? TEST_CAMPAIGN : TERMS_CAMPAIGN;
    let accepted = 0;
    let failed = 0;
    let skipped = 0;

    for (const device of devices) {
      const { data: preference, error: preferenceError } = await admin
        .from("user_preferences")
        .select("push_notifications")
        .eq("user_id", device.user_id)
        .maybeSingle();
      if (preferenceError || preference?.push_notifications !== true) {
        skipped++;
        continue;
      }
      if (!/^[a-f0-9]+$/i.test(device.token)) {
        failed++;
        continue;
      }

      if (body.mode === "test") {
        // Test sends go only to the administrator's own iPhone; release an earlier
        // failed or uncertain test claim so the test can be retried. Accepted claims stay.
        const { error: releaseError } = await admin
          .from("push_campaign_deliveries")
          .delete()
          .eq("campaign", TEST_CAMPAIGN)
          .eq("push_token_id", device.id)
          .in("status", RETRYABLE_TEST_STATUSES);
        if (releaseError) return respond({ error: "Could not reset the earlier test attempt" }, 500);
      }

      const { error: claimError } = await admin
        .from("push_campaign_deliveries")
        .insert({ campaign, push_token_id: device.id, status: "claimed" });
      if (claimError) {
        if (claimError.code === "23505") {
          skipped++;
          continue;
        }
        return respond({ error: "Could not reserve notification delivery", accepted, failed, skipped }, 500);
      }

      let status = 0;
      let reason = "";
      let revokedAt: number | undefined;

      try {
        const response = await fetch(`${endpoint}/3/device/${encodeURIComponent(device.token)}`, {
          method: "POST",
          signal: AbortSignal.timeout(15_000),
          headers: {
            authorization: `bearer ${jwt}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "apns-collapse-id": campaign,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(termsPayload()),
        });

        status = response.status;
        if (!response.ok) {
          const failure = await response.json().catch(() => ({}));
          reason = appleFailureDiagnostic(status, failure?.reason).reason;
          revokedAt = typeof failure?.timestamp === "number" ? failure.timestamp : undefined;
        } else {
          await response.body?.cancel();
        }
      } catch {
        status = 0;
        reason = "TransportFailure";
      }

      if (status !== 200) {
        console.error(
          "[APNS_TERMS][APPLE_REJECTION]",
          JSON.stringify({
            campaign,
            ...appleFailureDiagnostic(status, reason),
          }),
        );
      }

      const resultStatus = status === 200 ? "accepted" : status === 0 ? "uncertain" : "failed";
      const { error: updateError } = await admin
        .from("push_campaign_deliveries")
        .update({ status: resultStatus, apns_status: status })
        .eq("campaign", campaign)
        .eq("push_token_id", device.id);

      if (status === 200) accepted++;
      else failed++;
      if (updateError)
        return respond({ error: "Delivery occurred but tracking could not be saved", accepted, failed, skipped }, 500);

      if (permanentlyInvalid(status, reason) && revokedAt !== undefined && Date.parse(device.updated_at) <= revokedAt) {
        await admin
          .from("push_tokens")
          .delete()
          .eq("id", device.id)
          .eq("user_id", device.user_id)
          .eq("updated_at", device.updated_at);
      }

      if (status === 403 || reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic") {
        return respond(
          {
            error: `Apple rejected delivery (${status} - ${reason}); ${appleReasonHint(reason)}`,
            apple_status: status,
            apple_reason: reason,
            accepted,
            failed,
            skipped,
          },
          502,
        );
      }
    }

    return respond({
      campaign,
      accepted,
      failed,
      skipped,
      next_after_id: body.mode === "broadcast" && devices.length === 100 ? devices[devices.length - 1]?.id : null,
      device_display_verified: false,
    });
  } catch {
    console.error("[APNS_TERMS][FATAL] Apple delivery configuration or processing failed");
    return respond({ error: "Apple delivery could not be completed; verify server settings and HTTP/2 support" }, 503);
  } finally {
    console.log("[APNS_TERMS][END]");
  }
});
