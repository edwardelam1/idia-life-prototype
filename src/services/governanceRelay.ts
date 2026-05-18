import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://zxyngqciipcvveigrzqt.supabase.co";

export interface GovernanceRelayParams {
  actionType: "APPROVE_AND_EXECUTE";
  escrowTarget: "team" | "ecosystem";
  proposalId: string | number;
  actionId?: string; // dao_pending_actions.id, for DB reconciliation
  chainId?: number; // defaults to 8453 (Base Mainnet)
}

export interface GovernanceRelayResult {
  success: true;
  tx_hash: string;
  block_number: number;
  target_contract: string;
  network: string;
}

/**
 * Routes a governance command through the gasless relayer edge function.
 * No client-side wallet is needed — the relayer signs on Base Mainnet.
 */
export async function relayGovernanceAction(
  params: GovernanceRelayParams,
): Promise<GovernanceRelayResult> {
  console.log(
    `[GOV_UI][START] Dispatching ${params.actionType} on ${params.escrowTarget} (proposal ${params.proposalId})`,
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.error("[GOV_UI][ERROR] No active session token; cannot relay.");
    throw new Error("You must be signed in to execute governance actions.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/relay-governance-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      actionType: params.actionType,
      escrowTarget: params.escrowTarget,
      proposalId: params.proposalId,
      actionId: params.actionId,
      chainId: params.chainId ?? 8453,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const failedAt = (result as any)?.failed_at ? ` (stage: ${(result as any).failed_at})` : "";
    console.error(`[GOV_UI][ERROR] Relay failed${failedAt}: ${(result as any)?.error}`);
    throw new Error((result as any)?.error || "Governance relay failed.");
  }

  console.log(
    `[GOV_UI][SUCCESS] Tx ${result.tx_hash} mined in block ${result.block_number} on ${result.network}`,
  );
  return result as GovernanceRelayResult;
}
