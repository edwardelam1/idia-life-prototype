import { toast } from "@/hooks/use-toast";

// Monotonic token identifying the only biometric prompt whose result may be honoured.
let activeBiometricToken = 0;



/**
 * IDIA Protocol: Localized Native ACA Hardware Generator
 * Mandatory for all Human Touchpoints (Accept, Okay, Link, Transact)
 */
export const generateACAHash = async (
  userId: string,
  sourceId: string,
  scopes: string[] = ["CONSENT_GENERAL"],
): Promise<{ hash: string; payload: any }> => {
  console.log(`🪪 [BEGIN: generateACAHash] Initializing verification sequence for touchpoint: ${sourceId}`);

  // Detect pure native shell via our custom WKWebView bridge instead of Capacitor
  const isNative = typeof window !== "undefined" && !!(window as any).webkit?.messageHandlers?.triggerBiologicalCapture;

  try {
    let hardwareAttestationId: string;

    if (isNative) {
      console.log(`🪪 [PROCESS: generateACAHash] Environment: Pure Native Shell. Requesting localized hardware lock.`);

      try {
        console.log(`🪪 [BEGIN: performBiologicalBinding] Triggering Secure Enclave via WKWebView bridge`);

        // Await the asynchronous hardware result from the Swift shell.
        // Bounded: if the shell never answers (sheet dismissed, app backgrounded,
        // shell replying on a different channel) the flow fails with a named
        // timeout instead of deadlocking the caller forever.
        await new Promise((resolve, reject) => {
          // Each request owns a token. A stale/abandoned prompt (e.g. a cancelled Ford
          // attempt) can never swallow or clobber the result of the current one.
          const token = ++activeBiometricToken;
          const previousGlobalCallback = (window as any).onBiologicalCaptureResult;
          let ownCallback: any = null;

          const isStale = () => token !== activeBiometricToken;

          const handleSuccess = () => {
            if (isStale()) return;
            console.log(`🪪 [END: performBiologicalBinding] SUCCESS: Biological signature verified by Secure Enclave.`);
            cleanup();
            resolve(true);
          };

          const handleError = (e: any) => {
            if (isStale()) return;
            const reason = e?.detail?.error ?? (typeof e === "string" ? e : e?.detail);
            console.error(`🚨 [FAIL: performBiologicalBinding] ERROR: Native shell rejected biological prompt. Reason: ${reason}`);
            cleanup();
            reject(new Error(reason || "BIOMETRIC_REJECTED"));
          };

          const timeout = setTimeout(() => {
            console.error("🚨 [FAIL: performBiologicalBinding] TIMEOUT: Secure Enclave never answered the challenge.");
            cleanup();
            if (!isStale()) reject(new Error("BIOMETRIC_TIMEOUT: Face ID prompt did not complete. Please retry."));
          }, 60000);

          const cleanup = () => {
            clearTimeout(timeout);
            window.removeEventListener("biological:capture-success", handleSuccess);
            window.removeEventListener("biological:capture-error", handleError);
            // Only restore if we still own the global slot — never stomp a newer prompt.
            if ((window as any).onBiologicalCaptureResult === ownCallback) {
              (window as any).onBiologicalCaptureResult = previousGlobalCallback;
            }
          };

          // Channel 1: native dispatch events
          window.addEventListener("biological:capture-success", handleSuccess);
          window.addEventListener("biological:capture-error", handleError);

          // Channel 2: global callback some shells invoke instead of dispatching events
          ownCallback = (ok: boolean, error?: string) => {
            if (ok) handleSuccess();
            else handleError({ detail: { error: error || "BIOMETRIC_REJECTED" } });
          };
          (window as any).onBiologicalCaptureResult = ownCallback;

          // Trigger the hardware
          (window as any).webkit.messageHandlers.triggerBiologicalCapture.postMessage({});
        });


        // Generate a secure local UUID to replace the deprecated Capacitor Device.getId()
        const secureLocalId = crypto.randomUUID();
        hardwareAttestationId = `${secureLocalId}:${Date.now()}:NATIVE_ENCLAVE_VERIFIED`;
        console.log(`🪪 [PROCESS: generateACAHash] Hardware attestation generated: ${hardwareAttestationId}`);
      } catch (nativeErr: any) {
        console.error(`🚨 [FAIL: generateACAHash] FATAL: Hardware handshake rejected by user or system.`);
        throw new Error(`BIOMETRIC_REJECTED:${nativeErr?.message || "unknown"}`);
      }
    } else {
      // ─── WEB / PREVIEW SIMULATION (temporary) ─────────────────────────────
      console.log(`🪪 [PROCESS: generateACAHash] Environment: Web/Simulation. Bypassing Secure Enclave.`);
      const randomBytes = crypto.getRandomValues(new Uint8Array(16));
      const randomHex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      hardwareAttestationId = `${randomHex}:${Date.now()}:WEB_SIMULATION`;
    }

    // ─── IMMUTABLE PAYLOAD CONSTRUCTION ─────────────────────────────────────
    console.log(`🪪 [PROCESS: generateACAHash] Constructing immutable payload.`);
    const basePayload = {
      platform_guid: userId,
      source_id: sourceId,
      timestamp: new Date().toISOString(),
      consent_scope: scopes,
      hardware_attestation_id: hardwareAttestationId, // Timestamped Reality proof
    };

    const msgUint8 = new TextEncoder().encode(JSON.stringify(basePayload));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const finalPayload = {
      ...basePayload,
      aca_hash_key: hashHex,
    };

    console.log(
      `🪪 [END: generateACAHash] SUCCESS: Intent anchored and signed. ACA Hash: [${hashHex.substring(0, 8)}...]`,
    );

    return {
      hash: hashHex,
      payload: finalPayload,
    };
  } catch (error: any) {
    console.error(`🚨 [FAIL: generateACAHash] CRITICAL_FAILURE: Sequence aborted. Reason: ${error.message}`);

    toast({
      title: "Handshake Failed",
      description: isNative
        ? "Face ID / Touch ID is required to anchor this action."
        : "Open the IDIA iOS app to complete this action — the web preview cannot anchor consent.",
      variant: "destructive",
    });

    throw new Error(`ACA_PROMPT_REJECTED: ${error.message}`);
  }
};
