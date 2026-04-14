/**
 * DELT Protocol: Mandatory ACA Hash Generator
 * Every connection triggers this to create an Auditable Consent Artifact.
 */
export const generateACAHash = async (
  userId: string,
  sourceId: string,
  scopes: string[] = ['KYC_VAULT', 'WALLET_PROVISIONING']
): Promise<{ hash: string; payload: Record<string, unknown> }> => {
  const payload = {
    platform_guid: userId,
    source_id: sourceId,
    timestamp: new Date().toISOString(),
    consent_scope: scopes,
    entropy: crypto.randomUUID(),
  };

  const msgUint8 = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, payload };
};
