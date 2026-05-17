import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "capacitor-native-biometric";
import { Device } from "@capacitor/device";
import { toast } from "@/hooks/use-toast";

/**
 * IDIA Protocol: Universal ACA Hardware Generator
 * Mandatory for all Human Touchpoints (Accept, Okay, Link, Transact)
 */
export const generateACAHash = async (
  userId: string,
  sourceId: string,
  scopes: string[] = ["CONSENT_GENERAL"],
): Promise<{ hash: string; payload: any }> => {
  console.log(`[ACA_HARDWARE] START: Verification sequence for touchpoint: ${sourceId}`);

  const isNative = Capacitor.isNativePlatform();

  try {
    let hardwareAttestationId: string;

    if (isNative) {
      // ─── MOBILE HARDWARE ANCHOR (Face ID / Touch ID via Secure Enclave) ───
      // This forces the physical prompt. No biometric = No hash. No hash = No entry.
      console.log(`[ACA_HARDWARE] PLATFORM: Native. Requesting hardware attestation.`);

      try {
        // Confirm hardware is present and enrolled before prompting
        const available = await NativeBiometric.isAvailable();
        if (!available.isAvailable) {
          throw new Error("BIOMETRIC_HARDWARE_UNAVAILABLE");
        }

        // Triggers Face ID / Touch ID. Resolves on success, rejects on cancel/failure.
        await NativeBiometric.verifyIdentity({
          reason: `Biological anchor required for: ${sourceId}`,
          title: "Verify Sovereign Intent",
          subtitle: "Proof of physical presence",
          description: "Required to write to the IDIA ledger.",
        });

        // Bind the attestation to this physical device. Device.getId() returns
        // the IDFV on iOS / a stable hardware id on Android. Combined with the
        // post-verification timestamp it forms an anchor that only exists
        // *after* a real Face ID / Touch ID confirmation succeeds.
        const { identifier } = await Device.getId();
        hardwareAttestationId = `${identifier}:${Date.now()}:${available.biometryType}`;
      } catch (nativeErr: any) {
        console.error(`[ACA_HARDWARE] FATAL: Hardware handshake rejected.`, nativeErr);
        throw new Error(`BIOMETRIC_REJECTED:${nativeErr?.message || "unknown"}`);
      }
    } else {
      // ─── WEB / PREVIEW SIMULATION (temporary) ─────────────────────────────
      console.log("[ACA_HARDWARE] PLATFORM: Web. Generating simulated attestation.");
      const randomBytes = crypto.getRandomValues(new Uint8Array(16));
      const randomHex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      hardwareAttestationId = `${randomHex}:${Date.now()}`;
    }

    // ─── IMMUTABLE PAYLOAD CONSTRUCTION ─────────────────────────────────────
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

    console.log(`[ACA_HARDWARE] SUCCESS: Intent anchored. Hash: [${hashHex.substring(0, 8)}]`);

    return {
      hash: hashHex,
      payload: finalPayload,
    };
  } catch (error: any) {
    console.error(`[ACA_HARDWARE] CRITICAL_FAILURE: ${error.message}`);

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
