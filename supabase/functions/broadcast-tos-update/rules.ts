export const TERMS_CAMPAIGN = "life-terms-v2-2026-11-14";
export const TEST_CAMPAIGN = `${TERMS_CAMPAIGN}:device-test`;
export const REQUIRED_PUSH_ROLE = "super_admin";

// Only documented Apple reason codes may enter logs; never log raw response bodies.
const APPLE_REASONS = new Set([
  "BadCollapseId", "BadDeviceToken", "BadExpirationDate", "BadMessageId",
  "BadPriority", "BadTopic", "DeviceTokenNotForTopic", "DuplicateHeaders",
  "IdleTimeout", "InvalidPushType", "MissingDeviceToken", "MissingTopic",
  "PayloadEmpty", "TopicDisallowed", "BadCertificate", "BadCertificateEnvironment",
  "ExpiredProviderToken", "Forbidden", "InvalidProviderToken", "MissingProviderToken",
  "BadPath", "MethodNotAllowed", "Unregistered", "PayloadTooLarge",
  "TooManyProviderTokenUpdates", "TooManyRequests", "InternalServerError",
  "ServiceUnavailable", "Shutdown",
]);

export function appleFailureDiagnostic(status: number, reason: unknown) {
  return {
    status,
    reason: status === 0 ? "TransportFailure" :
      typeof reason === "string" && APPLE_REASONS.has(reason) ? reason : "UnknownAppleReason",
  };
}

export function appleEndpoint(environment: string): string {
  if (environment === "production") return "https://api.push.apple.com";
  if (environment === "sandbox") return "https://api.sandbox.push.apple.com";
  throw new Error("Apple environment is not configured correctly");
}

export function permanentlyInvalid(status: number, reason: string): boolean {
  // BadDeviceToken and DeviceTokenNotForTopic can mean a configuration mismatch.
  // Only Unregistered establishes that Apple has revoked this registration.
  return status === 410 && reason === "Unregistered";
}

export function mayBroadcast(testAccepted: boolean, deviceConfirmed: boolean): boolean {
  return testAccepted && deviceConfirmed;
}

export function termsPayload() {
  return {
    aps: {
      alert: {
        title: "IDIA Life Terms of Service Update",
        body: "Please review the Terms of Service and complete any required consent in IDIA Life.",
      },
      sound: "default",
    },
    campaign: TERMS_CAMPAIGN,
    action: "review-consent",
  };
}