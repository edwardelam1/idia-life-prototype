import { assertEquals, assertThrows } from "jsr:@std/assert";
import { appleEndpoint, appleFailureDiagnostic, mayBroadcast, permanentlyInvalid, REQUIRED_PUSH_ROLE } from "./rules.ts";

Deno.test("Apple rejection diagnostics preserve exact BadDeviceToken and DeviceTokenNotForTopic reasons", () => {
  assertEquals(appleFailureDiagnostic(400, "BadDeviceToken"), { status: 400, reason: "BadDeviceToken" });
  assertEquals(appleFailureDiagnostic(400, "DeviceTokenNotForTopic"), { status: 400, reason: "DeviceTokenNotForTopic" });
  assertEquals(appleFailureDiagnostic(403, "InvalidProviderToken"), { status: 403, reason: "InvalidProviderToken" });
  assertEquals(appleFailureDiagnostic(503, "ServiceUnavailable"), { status: 503, reason: "ServiceUnavailable" });
});
Deno.test("Apple diagnostics never include arbitrary bodies, device tokens, or transport exceptions", () => {
  assertEquals(appleFailureDiagnostic(400, "https://api.push.apple.com/3/device/private-token"), { status: 400, reason: "UnknownAppleReason" });
  assertEquals(appleFailureDiagnostic(400, { token: "private-token" }), { status: 400, reason: "UnknownAppleReason" });
  assertEquals(appleFailureDiagnostic(0, "private transport details"), { status: 0, reason: "TransportFailure" });
});

Deno.test("production uses Apple's production endpoint", () => {
  assertEquals(appleEndpoint("production"), "https://api.push.apple.com");
});
Deno.test("Xcode sandbox uses Apple's sandbox endpoint", () => {
  assertEquals(appleEndpoint("sandbox"), "https://api.sandbox.push.apple.com");
  assertThrows(() => appleEndpoint("invalid"));
});
Deno.test("Apple revocation alone permits removal, not configuration errors", () => {
  assertEquals(permanentlyInvalid(410, "Unregistered"), true);
  assertEquals(permanentlyInvalid(400, "BadDeviceToken"), false);
  assertEquals(permanentlyInvalid(400, "DeviceTokenNotForTopic"), false);
  assertEquals(permanentlyInvalid(503, "ServiceUnavailable"), false);
});
Deno.test("broadcast requires an accepted device test and human display confirmation", () => {
  assertEquals(mayBroadcast(false, true), false);
  assertEquals(mayBroadcast(true, false), false);
  assertEquals(mayBroadcast(true, true), true);
});
Deno.test("push administration uses this project's protected super_admin role", () => {
  assertEquals(REQUIRED_PUSH_ROLE, "super_admin");
});
Deno.test("test retries release only non-accepted claims", () => {
  assertEquals(RETRYABLE_TEST_STATUSES.includes("accepted"), false);
  assertEquals(RETRYABLE_TEST_STATUSES.includes("failed"), true);
});

Deno.test("403 provider token rejection points at signing settings", () => {
  assertEquals(appleReasonHint("InvalidProviderToken").includes("Key ID"), true);
});
