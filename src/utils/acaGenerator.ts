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
  const isIOSNative = typeof window !== "undefined" && !!(window as any).webkit?.messageHandlers?.triggerBiologicalCapture;
  // Android shell exposes the Capacitor biometric plugin instead.
  const androidBiometric =
    typeof window !== "undefined" ? (window as any).Capacitor?.Plugins?.IDIABiometric : undefined;
  const isAndroidNative = !!androidBiometric;
  const isNative = isIOSNative || isAndroidNative;

  try {
    let hardwareAttestationId: string;

    if (isAndroidNative) {
      console.log(`🪪 [BEGIN: performBiologicalBinding] Triggering Android BiometricPrompt`);
      try {
        const result = await androidBiometric.authenticate({
          title: "Confirm your identity",
          subtitle: "IDIA Sovereign Consent",
        });
        if (!result?.verified) throw new Error("BIOMETRIC_REJECTED");
        console.log(`🪪 [END: performBiologicalBinding] SUCCESS: Android biometric verified.`);
        hardwareAttestationId = `${crypto.randomUUID()}:${Date.now()}:ANDROID_KEYSTORE_VERIFIED`;
      } catch (androidErr: any) {
        console.error(`🚨 [FAIL: performBiologicalBinding] Android biometric rejected: ${androidErr?.message}`);
        throw new Error(`BIOMETRIC_REJECTED:${androidErr?.message || "unknown"}`);
      }
    } else if (isIOSNative) {
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
      // Synthetic / web-simulated ACAs are prohibited: an ACA requires real biometric capture.
      console.warn(`🚨 [FAIL: generateACAHash] No hardware biometric available — ACA refused.`);
      toast({
        title: "Mobile App Required",
        description:
          "Biometric verification is required to anchor an Auditable Consent Artifact (ACA). To perform this action, please use the IDIA mobile app.",
        variant: "destructive",
      });
      throw new Error("ACA_PROMPT_REJECTED: MOBILE_APP_REQUIRED");
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

    if (String(error?.message || "").startsWith("ACA_PROMPT_REJECTED")) throw error;
    toast({
      title: "Handshake Failed",
      description: "Face ID / Touch ID / fingerprint is required to anchor this action.",
      variant: "destructive",
    });

    throw new Error(`ACA_PROMPT_REJECTED: ${error.message}`);
  }
};
