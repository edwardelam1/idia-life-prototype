import { useEffect, useState } from "react";
import MfaPanel from "./MfaPanel";
import SessionLockShield from "@/components/SessionLockShield";
import { supabase } from "@/integrations/supabase/client";
import { biometricsConfirmed, hasBiometricHardware, setBiometricsAvailable } from "@/lib/identityVerification";

/**
 * App entry gate. Native app: biometrics-first lock shield (Face ID prompt,
 * manual "Use MFA" fallback). Browser: Authenticator code required.
 */
export default function MfaEntryGate({ enabled }: { enabled: boolean }) {
  const [needed, setNeeded] = useState<"none" | "shield" | "mfa">("none");

  useEffect(() => {
    if (!enabled || biometricsConfirmed()) {
      setNeeded("none");
      return;
    }
    let alive = true;
    (async () => {
      console.log("[MFA_ENTRY_GATE][START]");
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!alive) return;
      const pass = !error && data?.currentLevel === "aal2";
      const mode = pass ? "none" : hasBiometricHardware() ? "shield" : "mfa";
      console.log(`[MFA_ENTRY_GATE][END] level=${data?.currentLevel} mode=${mode}`);
      setNeeded(mode);
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  if (needed === "none") return null;
  if (needed === "shield") return <SessionLockShield onVerified={() => setNeeded("none")} />;
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-background/95 p-4 backdrop-blur-2xl">
      <MfaPanel
        reason="Enter the code from your authenticator app to keep your account safe."
        onVerified={() => {
          setBiometricsAvailable(false);
          setNeeded("none");
        }}
        onSignOut={() => supabase.auth.signOut({ scope: "local" })}
      />
    </div>
  );
}
