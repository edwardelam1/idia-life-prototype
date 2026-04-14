/**
 * DELT Protocol: Mandatory ACA Hash Generator
 */
export const generateACAHash = async (
  userId: string,
  sourceId: string,
  scopes: string[] = ["KYC_VAULT", "HEALTH_DATA_READ"],
): Promise<{ hash: string; payload: any }> => {
  const payload = {
    platform_guid: userId,
    source_id: sourceId,
    timestamp: new Date().toISOString(),
    consent_scope: scopes,
    entropy: crypto.randomUUID(),
  };

  const msgUint8 = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return { hash: hashHex, payload };
};
