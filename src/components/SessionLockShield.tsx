import { useEffect, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";
import MfaPanel from "@/components/security/MfaPanel";

interface Props {
  /** Called once the Secure Enclave confirms the biological capture. */
  onVerified: () => void;
}

const hasEnclaveBridge = () =>
  typeof window !== "undefined" && !!(window as any).webkit?.messageHandlers?.triggerBiologicalCapture;

/**
 * Passive privacy shield shown while the OS Face ID / Touch ID sheet is up.
 * No buttons — the challenge fires automatically on mount and re-fires when
 * the user touches the screen or the app regains focus after a rejection.
 */
const SessionLockShield = ({ onVerified }: Props) => {
  const [status, setStatus] = useState<"challenging" | "rejected" | "mfa">(hasEnclaveBridge() ? "challenging" : "mfa");
  const inFlight = useRef(false);

  useEffect(() => {
    let mounted = true;
    let failOpenTimer: number | undefined;

    const challenge = () => {
      if (inFlight.current) return;

      if (!hasEnclaveBridge()) {
        // No biometrics on this device: re-entry requires an Authenticator code.
        console.log("[SESSION_SENTINEL][SHIELD] No biometric bridge — MFA re-entry.");
        setStatus("mfa");
        return;
      }

      inFlight.current = true;
      setStatus("challenging");
      console.log("[SESSION_SENTINEL][SHIELD][START] Firing biological capture challenge.");

      const cleanup = () => {
        window.removeEventListener("biological:capture-success", handleSuccess);
        window.removeEventListener("biological:capture-error", handleError);
        window.clearTimeout(failOpenTimer);
        inFlight.current = false;
      };

      const handleSuccess = () => {
        cleanup();
        console.log("[SESSION_SENTINEL][SHIELD][END:OK] Identity confirmed by Secure Enclave.");
        if (mounted) onVerified();
      };

      const handleError = (e: any) => {
        cleanup();
        console.warn(`[SESSION_SENTINEL][SHIELD][END:FAIL] ${e?.detail?.error || "BIOMETRIC_REJECTED"}`);
        const reason = String(e?.detail?.error || "");
        // Biometrics unavailable / blocked by privacy settings → MFA fallback.
        const unavailable = /NOT_AVAILABLE|NOT_ENROLLED|UNAVAILABLE|LOCKOUT|PERMISSION|DENIED|PASSCODE_NOT_SET/i.test(reason);
        if (mounted) setStatus(unavailable ? "mfa" : "rejected");
      };

      window.addEventListener("biological:capture-success", handleSuccess);
      window.addEventListener("biological:capture-error", handleError);

      // Fail-open: a silent bridge must never strand the user on a spinner.
      // The session is still valid and the 30-minute idle rule still applies.
      failOpenTimer = window.setTimeout(() => {
        cleanup();
        console.warn("[SESSION_SENTINEL][SHIELD][TIMEOUT] Bridge silent for 12s — failing open.");
        if (mounted) onVerified();
      }, 12000);

      try {
        (window as any).webkit.messageHandlers.triggerBiologicalCapture.postMessage({});
      } catch (err) {
        cleanup();
        console.error("[SESSION_SENTINEL][SHIELD] Bridge post failed", err);
        if (mounted) setStatus("rejected");
      }
    };

    challenge();

    // Retry silently on interaction only — the Face ID sheet itself churns
    // window focus, so a focus listener would re-fire the challenge in a loop.
    const retry = () => {
      if (!hasEnclaveBridge()) return;
      challenge();
    };
    window.addEventListener("pointerdown", retry);

    return () => {
      mounted = false;
      window.clearTimeout(failOpenTimer);
      window.removeEventListener("pointerdown", retry);
    };
  }, [onVerified]);


  if (status === "mfa") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-2xl">
        <MfaPanel reason="Enter the code from your authenticator app to unlock IDIA." onVerified={onVerified} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-32 h-32 rounded-full bg-primary/10 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center">
          <Fingerprint className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </div>
      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
        {status === "challenging" ? "Verifying Identity" : "Awaiting Biometric Confirmation"}
      </p>
    </div>
  );
};

export default SessionLockShield;
