import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint, KeyRound } from "lucide-react";
import MfaPanel from "@/components/security/MfaPanel";
import { Button } from "@/components/ui/button";
import { setBiometricsAvailable } from "@/lib/identityVerification";

interface Props {
  /** Called once identity is confirmed (biometric or Authenticator code). */
  onVerified: () => void;
}

const hasEnclaveBridge = () =>
  typeof window !== "undefined" && !!(window as any).webkit?.messageHandlers?.triggerBiologicalCapture;

/**
 * Biometrics-first lock shield. A failed/declined Face ID keeps the shield up;
 * tapping the fingerprint retries, and "Use MFA" manually opens the code gate.
 */
const SessionLockShield = ({ onVerified }: Props) => {
  const bridge = hasEnclaveBridge();
  const [status, setStatus] = useState<"challenging" | "rejected" | "mfa">(bridge ? "challenging" : "mfa");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const cleanupRef = useRef<() => void>(() => {});

  const challenge = useCallback(() => {
    if (!hasEnclaveBridge() || inFlight.current) return;
    inFlight.current = true;
    setStatus("challenging");
    console.log("[SESSION_SENTINEL][SHIELD][START] Firing biological capture challenge.");

    let failOpenTimer: number | undefined;
    const cleanup = () => {
      window.removeEventListener("biological:capture-success", handleSuccess);
      window.removeEventListener("biological:capture-error", handleError);
      window.clearTimeout(failOpenTimer);
      inFlight.current = false;
    };
    const handleSuccess = () => {
      cleanup();
      console.log("[SESSION_SENTINEL][SHIELD][END:OK] Identity confirmed by Secure Enclave.");
      setBiometricsAvailable(true);
      if (mounted.current) onVerified();
    };
    const handleError = (e: any) => {
      cleanup();
      console.warn(`[SESSION_SENTINEL][SHIELD][END:FAIL] ${e?.detail?.error || "BIOMETRIC_REJECTED"}`);
      if (mounted.current) setStatus((s) => (s === "mfa" ? s : "rejected"));
    };
    cleanupRef.current = cleanup;

    window.addEventListener("biological:capture-success", handleSuccess);
    window.addEventListener("biological:capture-error", handleError);
    failOpenTimer = window.setTimeout(() => {
      cleanup();
      console.warn("[SESSION_SENTINEL][SHIELD][TIMEOUT] Bridge silent for 12s — failing open.");
      if (mounted.current) onVerified();
    }, 12000);

    try {
      (window as any).webkit.messageHandlers.triggerBiologicalCapture.postMessage({});
    } catch (err) {
      cleanup();
      console.error("[SESSION_SENTINEL][SHIELD] Bridge post failed", err);
      if (mounted.current) setStatus("rejected");
    }
  }, [onVerified]);

  useEffect(() => {
    mounted.current = true;
    if (bridge) challenge();
    else console.log("[SESSION_SENTINEL][SHIELD] No biometric bridge — opening Authenticator code.");
    return () => {
      mounted.current = false;
      cleanupRef.current();
    };
  }, [bridge, challenge]);

  const switchToMfa = () => {
    console.log("[SESSION_SENTINEL][SHIELD] User chose MFA.");
    cleanupRef.current();
    setStatus("mfa");
  };

  const retryBiometrics = () => {
    console.log("[SESSION_SENTINEL][SHIELD] User tapped fingerprint — retrying biometrics.");
    challenge();
  };

  const fingerprint = (
    <button
      type="button"
      aria-label="Retry biometrics"
      onClick={retryBiometrics}
      className="relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="absolute w-32 h-32 rounded-full bg-primary/10 animate-ping" />
      <div className="relative w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center">
        <Fingerprint className="w-12 h-12 text-primary animate-pulse" />
      </div>
    </button>
  );

  if (status === "mfa") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-background/95 p-4 backdrop-blur-2xl">
        {bridge && fingerprint}
        <MfaPanel
          reason="Enter the code from your authenticator app to unlock IDIA."
          onVerified={() => {
            setBiometricsAvailable(false);
            onVerified();
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl">
      {fingerprint}
      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
        {status === "challenging" ? "Verifying Identity" : "Awaiting Biometric Confirmation"}
      </p>
      <Button variant="ghost" size="sm" onClick={switchToMfa} className="mt-6 gap-2 text-xs text-muted-foreground">
        <KeyRound className="h-4 w-4" /> Use MFA
      </Button>
    </div>
  );
};

export default SessionLockShield;
