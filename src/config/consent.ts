// Required consent versions. Bumping any REQUIRED_* version forces every user
// (new + existing) through the corresponding onboarding gate on next login.
export const REQUIRED_AGE_VERIFICATION_VERSION = "v1";
export const REQUIRED_TOS_VERSION = "v2";
export const REQUIRED_AOR_VERSION = "v1";

export interface ConsentMeta {
  age_verified?: boolean;
  age_verified_at?: string;
  age_verification_version?: string;
  tos_version?: string;
  tos_accepted_at?: string;
  aor_decision?: "accepted" | "declined" | null;
  aor_version?: string;
}

export type ConsentGateTarget = "/age-verification" | "/terms" | "/authority-of-record" | null;

export function nextConsentRoute(meta: ConsentMeta | null | undefined): ConsentGateTarget {
  const m = meta || {};
  // Age gate ALWAYS wins — must pass before ToS or AoR.
  if (m.age_verification_version !== REQUIRED_AGE_VERIFICATION_VERSION || m.age_verified !== true) {
    return "/age-verification";
  }
  if (m.tos_version !== REQUIRED_TOS_VERSION) return "/terms";
  if (!m.aor_decision) return "/authority-of-record";
  return null;
}
