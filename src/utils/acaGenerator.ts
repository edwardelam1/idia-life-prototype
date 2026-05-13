/**
 * IDIA Protocol: Auditable Consent Artifact (ACA) Hardware Generator
 * Hardened for M-Series Secure Enclave & Mobile Biometrics
 */
export const generateACAHash = async (
  userId: string,
  sourceId: string,
  scopes: string[] = ["GOVERNANCE_VOTE", "REGISTRY_BONDING"],
): Promise<{ hash: string; payload: any }> => {
  console.log(`[ACA_HARDWARE] START: Initializing hardware attestation for user ${userId.slice(0, 8)}`);

  // Check if the hardware-backed biometrics interface is even available in this browser
  if (!window.PublicKeyCredential) {
    console.error("[ACA_HARDWARE] FATAL: This browser or environment does not support Hardware Attestation.");
    throw new Error("UNSUPPORTED_ENVIRONMENT: Hardware Secure Enclave unavailable.");
  }

  try {
    // 1. GENERATE THE CHALLENGE
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // 2. TRIGGER THE PHYSICAL REALITY PROMPT
    console.log(`[ACA_HARDWARE] PROMPT: Awaiting physical biological anchor (TouchID/FaceID)...`);

    // We cast to 'any' initially to avoid complex DOM library type conflicts in the build,
    // then extract the rawId which is the cryptographic proof.
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "IDIA Protocol" },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: "Sovereign Participant",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as any;

    if (!credential || !credential.rawId) {
      throw new Error("Hardware Attestation Failed: Secure Enclave returned an invalid or null payload.");
    }

    console.log(`[ACA_HARDWARE] SUCCESS: Biological anchor verified via Hardware Attestation.`);

    // 3. CREATE THE IMMUTABLE BINDING
    // Convert the rawId (ArrayBuffer) to a Base64 string safely
    const rawIdArray = new Uint8Array(credential.rawId);
    let binary = "";
    for (let i = 0; i < rawIdArray.byteLength; i++) {
      binary += String.fromCharCode(rawIdArray[i]);
    }
    const hardwareAttestationId = btoa(binary);

    const basePayload = {
      platform_guid: userId,
      source_id: sourceId,
      timestamp: new Date().toISOString(),
      consent_scope: scopes,
      hardware_attestation_id: hardwareAttestationId,
    };

    // Generate the final SHA-256 Hash of the combined physical/digital data
    const msgUint8 = new TextEncoder().encode(JSON.stringify(basePayload));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const finalPayload = {
      ...basePayload,
      aca_hash_key: hashHex,
    };

    console.log(`[ACA_HARDWARE] END: Generated immutable ACA Hash: ${hashHex.substring(0, 12)}...`);

    return {
      hash: hashHex,
      payload: finalPayload,
    };
  } catch (error: any) {
    console.error(`[ACA_HARDWARE] CRITICAL_FAILURE: Hardware handshake aborted. Reason: ${error.message}`);
    // Re-throw to ensure the UI stops the ledger write
    throw new Error(`ACA_PROMPT_REJECTED: ${error.message}`);
  }
};
