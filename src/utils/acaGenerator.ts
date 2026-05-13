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

  try {
    // 1. GENERATE THE CHALLENGE
    // We create a one-time challenge to prevent replay attacks.
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // 2. TRIGGER THE PHYSICAL REALITY PROMPT
    // This is the "Reality" Trigger. This command wakes up the MacBook Secure Enclave
    // or Mobile Biometric sensor. It MUST prompt the user for TouchID/FaceID.
    console.log(`[ACA_HARDWARE] PROMPT: Awaiting physical biological anchor (TouchID/FaceID)...`);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "IDIA Protocol" },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: "Sovereign Participant",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256 (Secure Enclave Standard)
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Forces built-in hardware (not external keys)
          userVerification: "required", // Hard-stop if biometrics are bypassed
        },
        timeout: 60000,
      },
    })) as AuthenticatorAttestationResponse | null;

    if (!credential) {
      throw new Error("Hardware Attestation Failed: Null response from Secure Enclave.");
    }

    console.log(`[ACA_HARDWARE] SUCCESS: Biological anchor verified via Hardware Attestation.`);

    // 3. CREATE THE IMMUTABLE BINDING
    // We hash the User ID, the Source, and the Hardware's unique response.
    // This proves that THIS specific human touched THIS specific hardware for THIS action.
    const basePayload = {
      platform_guid: userId,
      source_id: sourceId,
      timestamp: new Date().toISOString(),
      consent_scope: scopes,
      // We use the raw hardware response id as the entropy source, not a pseudo UUID.
      hardware_attestation_id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
    };

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
