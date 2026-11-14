export const TERMS_CAMPAIGN = "life-terms-v2-2026-11-14";
export const TEST_CAMPAIGN = `${TERMS_CAMPAIGN}:device-test`;
export const REQUIRED_PUSH_ROLE = "super_admin";

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