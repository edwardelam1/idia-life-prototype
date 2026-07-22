// Required consent versions. Bumping REQUIRED_TOS_VERSION forces every user
// (new + existing) through the ToS + AoR flow on their next login.
export const REQUIRED_TOS_VERSION = "v2";
export const REQUIRED_AOR_VERSION = "v1";

export interface ConsentMeta {
  tos_version?: string;
  tos_accepted_at?: string;
  aor_decision?: "accepted" | "declined" | null;
  aor_version?: string;
}

export type ConsentGateTarget = "/terms" | "/authority-of-record" | null;

export function nextConsentRoute(meta: ConsentMeta | null | undefined): ConsentGateTarget {
  const m = meta || {};
  if (m.tos_version !== REQUIRED_TOS_VERSION) return "/terms";
  if (!m.aor_decision) return "/authority-of-record";
  return null;
}
