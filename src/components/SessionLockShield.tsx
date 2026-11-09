import { useEffect, useRef, useState } from "react";
import { Fingerprint, KeyRound } from "lucide-react";
import MfaPanel from "@/components/security/MfaPanel";
import { Button } from "@/components/ui/button";
import { biometricsMarkedUnavailable, setBiometricsAvailable } from "@/lib/identityVerification";

interface Props {
  /** Called once the Secure Enclave confirms the biological capture. */
  onVerified: () => void;
}

const hasEnclaveBridge = () =>
  typeof window !== "undefined" && !!(window as any).webkit?.messageHandlers?.triggerBiologicalCapture;

/**
 * Privacy shield shown while the OS Face ID / Touch ID sheet is up. Users can
 * switch to an Authenticator code at any time; that choice is remembered so
 * later re-entry locks open straight to the code screen.
 */
const SessionLockShield = ({ onVerified }: Props) => {
  const startInMfa = !hasEnclaveBridge() || biometricsMarkedUnavailable();
  const [status, setStatus] = useState<"challenging" | "rejected" | "mfa">(startInMfa ? "mfa" : "challenging");
  const inFlight = useRef(false);
  const mfaMode = useRef(startInMfa);

  useEffect(() => {
    if (mfaMode.current) {
      console.log("[SESSION_SENTINEL][SHIELD] Opening Authenticator re-entry (no bridge or remembered preference).");
      return;
    }
    let mounted = true;
    let failOpenTimer: number | undefined;

    const challenge = () => {
      if (inFlight.current || mfaMode.current) return;

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
        setBiometricsAvailable(true);
        if (mounted) onVerified();
      };

      const handleError = (e: any) => {
        cleanup();
        console.warn(`[SESSION_SENTINEL][SHIELD][END:FAIL] ${e?.detail?.error || "BIOMETRIC_REJECTED"}`);
        if (mounted && !mfaMode.current) setStatus("rejected");
      };

      window.addEventListener("biological:capture-success", handleSuccess);
      window.addEventListener("biological:capture-error", handleError);

      failOpenTimer = window.setTimeout(() => {
        cleanup();
        console.warn("[SESSION_SENTINEL][SHIELD][TIMEOUT] Bridge silent for 12s — failing open.");
        if (mounted && !mfaMode.current) onVerified();
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

    const retry = (ev: PointerEvent) => {
      if (mfaMode.current) return;
      if ((ev.target as HTMLElement)?.closest?.("[data-mfa-switch]")) return;
      challenge();
    };
    window.addEventListener("pointerdown", retry);

    return () => {
      mounted = false;
      window.clearTimeout(failOpenTimer);
      window.removeEventListener("pointerdown", retry);
    };
  }, [onVerified]);

  const switchToMfa = () => {
    console.log("[SESSION_SENTINEL][SHIELD] User chose Authenticator code.");
    mfaMode.current = true;
    setStatus("mfa");
  };

  const handleMfaVerified = () => {
    setBiometricsAvailable(false);
    onVerified();
  };

  if (status === "mfa") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-2xl">
        <MfaPanel reason="Enter the code from your authenticator app to unlock IDIA." onVerified={handleMfaVerified} />
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
      <Button
        data-mfa-switch
        variant="ghost"
        size="sm"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={switchToMfa}
        className="mt-6 gap-2 text-xs text-muted-foreground"
      >
        <KeyRound className="h-4 w-4" /> Use Authenticator Code
      </Button>
    </div>
  );
};

export default SessionLockShield;
