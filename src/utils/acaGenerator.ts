import { Capacitor } from "@capacitor/core";
import { toast } from "@/hooks/use-toast";

/**
 * IDIA Protocol: Universal ACA Hardware Bridge (Mobile-First)
 * PURGED: Desktop WebAuthn (Omitted per Principal Architect)
 * ACTIVE: iOS Secure Enclave (Swift) / Android TEE (Kotlin)
 */
export const generateACAHash = async (
  userId: string,
  sourceId: string,
  scopes: string[] = ["GOVERNANCE_VOTE", "REGISTRY_BONDING"],
): Promise<{ hash: string; payload: any }> => {
  console.log(`[ACA_SYSTEM] START: Initializing Mobile Hardware Attestation for ${userId.slice(0, 8)}`);

  const isNative = Capacitor.isNativePlatform();

  try {
    let hardwareAttestationId: string;

    if (isNative) {
      // ─── NATIVE MOBILE HANDSHAKE (iOS / Android) ──────────────────────────
      console.log(`[ACA_SYSTEM] PLATFORM: Native detected. Invoking Biometric Native Bridge.`);

      try {
        // Utilizing the standard Capacitor Biometric plugin.
        // Ensure 'NativeBiometric' or equivalent is registered in MainActivity.kt
        const result = await (window as any).Capacitor.Plugins.NativeBiometric.verifyIdentity({
          reason: "IDIA Bio-Sovereign Validation",
          title: "Auditable Consent Required",
          description: `Action: ${sourceId}`,
        });

        // The hardware signature/token becomes our immutable entropy source
        hardwareAttestationId = result.signature || result.deviceToken;
        console.log(`[ACA_SYSTEM] SUCCESS: Native hardware returned biological anchor.`);
      } catch (nativeErr: any) {
        console.error(`[ACA_SYSTEM] FATAL: Mobile Hardware Handshake Refused: ${nativeErr.message}`);
        throw new Error("HARDWARE_HANDSHAKE_FAILED");
      }
    } else {
      // ─── DEVELOPMENT BYPASS (Lovable Preview / Web) ──────────────────────
      // Purged Desktop WebAuthn to avoid origin/iframe errors in development.
      console.warn("[ACA_SYSTEM] PLATFORM: Web Preview. Using Development Bypass Anchor.");
      hardwareAttestationId = `DEV_ENCLAVE_SIMULATION_${crypto.randomUUID()}`;
    }

    // ─── IMMUTABLE PAYLOAD CONSTRUCTION ─────────────────────────────────────
    const basePayload = {
      platform_guid: userId,
      source_id: sourceId,
      timestamp: new Date().toISOString(),
      consent_scope: scopes,
      hardware_attestation_id: hardwareAttestationId,
    };

    // SHA-256 Hashing of the hardware-bound payload
    const msgUint8 = new TextEncoder().encode(JSON.stringify(basePayload));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const finalPayload = {
      ...basePayload,
      aca_hash_key: hashHex,
    };

    console.log(`[ACA_SYSTEM] END: Immutable ACA Generated [${hashHex.substring(0, 8)}]`);

    return {
      hash: hashHex,
      payload: finalPayload,
    };
  } catch (error: any) {
    console.error(`[ACA_SYSTEM] CRITICAL_STALL: ${error.message}`);

    toast({
      title: "Handshake Aborted",
      description: "Hardware signature required for ledger write.",
      variant: "destructive",
    });

    throw new Error(`ACA_PROMPT_REJECTED: ${error.message}`);
  }
};
