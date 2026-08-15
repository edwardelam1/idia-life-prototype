import { useEffect, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";

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
  const [status, setStatus] = useState<"challenging" | "rejected">("challenging");
  const inFlight = useRef(false);

  useEffect(() => {
    let mounted = true;

    const challenge = () => {
      if (inFlight.current) return;

      if (!hasEnclaveBridge()) {
        // Web / preview: no Secure Enclave available — never lock the user out.
        console.log("[SESSION_SENTINEL][SHIELD] No enclave bridge (web). Auto-clearing shield.");
        onVerified();
        return;
      }

      inFlight.current = true;
      setStatus("challenging");
      console.log("[SESSION_SENTINEL][SHIELD][START] Firing biological capture challenge.");

      const cleanup = () => {
        window.removeEventListener("biological:capture-success", handleSuccess);
        window.removeEventListener("biological:capture-error", handleError);
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
        if (mounted) setStatus("rejected");
      };

      window.addEventListener("biological:capture-success", handleSuccess);
      window.addEventListener("biological:capture-error", handleError);

      try {
        (window as any).webkit.messageHandlers.triggerBiologicalCapture.postMessage({});
      } catch (err) {
        cleanup();
        console.error("[SESSION_SENTINEL][SHIELD] Bridge post failed", err);
        if (mounted) setStatus("rejected");
      }
    };

    challenge();

    // Retry silently on interaction or refocus — still zero explicit buttons.
    const retry = () => challenge();
    window.addEventListener("pointerdown", retry);
    window.addEventListener("focus", retry);

    return () => {
      mounted = false;
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("focus", retry);
    };
  }, [onVerified]);

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
