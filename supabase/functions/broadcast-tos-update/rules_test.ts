import { assertEquals, assertThrows } from "jsr:@std/assert";
import { appleEndpoint, mayBroadcast, permanentlyInvalid, REQUIRED_PUSH_ROLE } from "./rules.ts";

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