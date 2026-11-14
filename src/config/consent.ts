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
  aor_decided_at?: string;
}

export type ConsentGateTarget = "/age-verification" | "/terms" | "/authority-of-record" | null;

export function nextConsentRoute(meta: ConsentMeta | null | undefined): ConsentGateTarget {
  const m = meta || {};
  // Age gate ALWAYS wins — must pass before ToS or AoR.
  if (m.age_verification_version !== REQUIRED_AGE_VERIFICATION_VERSION || m.age_verified !== true) {
    return "/age-verification";
  }
  if (m.tos_version !== REQUIRED_TOS_VERSION || !isConsentTimestamp(m.tos_accepted_at)) return "/terms";
  // Authority of Record remains elective: a recorded decline is a valid decision.
  if (m.aor_version !== REQUIRED_AOR_VERSION ||
      (m.aor_decision !== "accepted" && m.aor_decision !== "declined") ||
      !isConsentTimestamp(m.aor_decided_at)) return "/authority-of-record";
  return null;
}

function isConsentTimestamp(value: string | undefined): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
