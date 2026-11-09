import { useEffect, useState } from "react";
import MfaPanel from "./MfaPanel";
import { supabase } from "@/integrations/supabase/client";
import { biometricsConfirmed, setBiometricsAvailable } from "@/lib/identityVerification";

/**
 * App entry gate: requires an Authenticator code (enrolling on first entry)
 * unless this device has a confirmed successful biometric capture. The mere
 * presence of the native bridge is not enough to skip it.
 */
export default function MfaEntryGate({ enabled }: { enabled: boolean }) {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (!enabled || biometricsConfirmed()) {
      setNeeded(false);
      return;
    }
    let alive = true;
    (async () => {
      console.log("[MFA_ENTRY_GATE][START]");
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!alive) return;
      const pass = !error && data?.currentLevel === "aal2";
      console.log(`[MFA_ENTRY_GATE][END] level=${data?.currentLevel} gate=${!pass}`);
      setNeeded(!pass);
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  if (!needed) return null;
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-background/95 p-4 backdrop-blur-2xl">
      <MfaPanel
        reason="Biometrics aren't confirmed on this device, so we use a code from your authenticator app to keep your account safe."
        onVerified={() => {
          setBiometricsAvailable(false);
          setNeeded(false);
        }}
        onSignOut={() => supabase.auth.signOut({ scope: "local" })}
      />
    </div>
  );
}
