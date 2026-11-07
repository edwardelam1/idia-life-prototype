/**
 * Identity verification: biometrics first, Authenticator-app (TOTP) MFA as the
 * fallback for users without usable biometrics.
 *
 * Rule: an ACA is ONLY produced by a real biometric capture. MFA verifies the
 * person but never produces an ACA. The Data page must not use this helper —
 * it calls generateACAHash directly so it stays biometric-only.
 */
import { supabase } from "@/integrations/supabase/client";
import { generateACAHash } from "@/utils/acaGenerator";

export const hasBiometricHardware = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!w.webkit?.messageHandlers?.triggerBiologicalCapture || !!w.Capacitor?.Plugins?.IDIABiometric;
};

/** Errors meaning biometrics are unavailable / not enrolled / blocked — not a user "no". */
const isBiometricUnavailable = (msg: string) =>
  /NOT_AVAILABLE|NOT_ENROLLED|UNAVAILABLE|NO_BIOMETRIC|BIOMETRY|LOCKOUT|PERMISSION|DENIED|PASSCODE_NOT_SET|MOBILE_APP_REQUIRED/i.test(
    msg,
  );

export async function getVerifiedTotpFactor() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data?.totp?.find((f) => f.status === "verified") ?? null;
}

// ── Global MFA prompt bridge (rendered by <MfaPromptHost/>) ──
type Pending = { reason: string; resolve: () => void; reject: (e: Error) => void };
let pending: Pending | null = null;
const listeners = new Set<(p: Pending | null) => void>();
export const subscribeMfaPrompt = (fn: (p: Pending | null) => void) => {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((l) => l(pending));
export const settleMfaPrompt = (ok: boolean) => {
  const p = pending;
  pending = null;
  emit();
  if (!p) return;
  ok ? p.resolve() : p.reject(new Error("MFA_CANCELLED"));
};

/** Opens the Authenticator-code prompt (enrolls first if needed). Resolves when verified. */
export const requestMfaVerification = (reason: string) =>
  new Promise<void>((resolve, reject) => {
    console.log(`[MFA_VERIFY][START] ${reason}`);
    if (pending) pending.reject(new Error("MFA_SUPERSEDED"));
    pending = {
      reason,
      resolve: () => {
        console.log("[MFA_VERIFY][END:OK]");
        resolve();
      },
      reject: (e) => {
        console.warn(`[MFA_VERIFY][END:FAIL] ${e.message}`);
        reject(e);
      },
    };
    emit();
  });

export type IdentityResult =
  | { method: "biometric"; hash: string; payload: any }
  | { method: "mfa" };

/** Verify the user for a non-Data action. Biometric (with ACA) when possible, else MFA (no ACA). */
export async function verifyIdentity(
  userId: string,
  sourceId: string,
  scopes: string[],
  reason: string,
): Promise<IdentityResult> {
  if (hasBiometricHardware()) {
    try {
      const { hash, payload } = await generateACAHash(userId, sourceId, scopes);
      return { method: "biometric", hash, payload };
    } catch (e: any) {
      if (!isBiometricUnavailable(String(e?.message || ""))) throw e;
      console.warn("[IDENTITY] Biometrics unavailable — falling back to MFA.");
    }
  }
  await requestMfaVerification(reason);
  return { method: "mfa" };
}
