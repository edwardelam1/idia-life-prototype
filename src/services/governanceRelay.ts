import { supabase } from "@/integrations/supabase/client";
import { stage } from "@/lib/stageLogger";

const SUPABASE_URL = "https://zxyngqciipcvveigrzqt.supabase.co";

export type EscrowTarget =
  | "team"
  | "ecosystem"
  | "liquidity"
  | "investors"
  | "publicSale";

export interface GovernanceRelayParams {
  actionType: "APPROVE_AND_EXECUTE";
  /**
   * All 5 IDIAEscrow.sol vaults expose the same `approveAndExecute(uint256)`
   * signature, so the relayer endpoint accepts any of them uniformly.
   */
  escrowTarget: EscrowTarget;
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
 *
 * Every async step is wrapped in a stage-tracer so silent stalls (RPC
 * hangs, dropped fetches, auth refresh deadlocks) surface immediately
 * in live terminal logs.
 */
export async function relayGovernanceAction(
  params: GovernanceRelayParams,
): Promise<GovernanceRelayResult> {
  const sDispatch = stage("GOV_RELAY", "DISPATCH");
  sDispatch.start({
    actionType: params.actionType,
    escrowTarget: params.escrowTarget,
    proposalId: params.proposalId,
  });

  // ── Stage 1: pull session token ──────────────────────────────────
  const sSession = stage("GOV_RELAY", "SESSION_FETCH");
  sSession.start();
  let accessToken: string;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const err = new Error("You must be signed in to execute governance actions.");
      sSession.fail(err);
      sDispatch.fail(err);
      throw err;
    }
    accessToken = session.access_token;
    sSession.ok({ hasToken: true });
  } catch (err) {
    sSession.fail(err);
    sDispatch.fail(err);
    throw err;
  }

  // ── Stage 2: POST to edge function ───────────────────────────────
  const sPost = stage("GOV_RELAY", "POST_REQUEST");
  sPost.start({ url: `${SUPABASE_URL}/functions/v1/relay-governance-action` });
  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/relay-governance-action`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          actionType: params.actionType,
          escrowTarget: params.escrowTarget,
          proposalId: params.proposalId,
          actionId: params.actionId,
          chainId: params.chainId ?? 8453,
        }),
      },
    );
    sPost.ok({ status: response.status });
  } catch (err) {
    sPost.fail(err);
    sDispatch.fail(err);
    throw err;
  }

  // ── Stage 3: parse response ──────────────────────────────────────
  const sParse = stage("GOV_RELAY", "PARSE_RESPONSE");
  sParse.start();
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const failedAt = (result as any)?.failed_at
      ? ` (stage: ${(result as any).failed_at})`
      : "";
    const err = new Error(
      `${(result as any)?.error || "Governance relay failed."}${failedAt}`,
    );
    sParse.fail(err);
    sDispatch.fail(err);
    throw err;
  }
  sParse.ok({ tx_hash: (result as any)?.tx_hash });

  // ── Stage 4: surface to caller ───────────────────────────────────
  const sSurface = stage("GOV_RELAY", "SURFACE_RESULT");
  sSurface.start();
  sSurface.ok({
    tx_hash: (result as GovernanceRelayResult).tx_hash,
    block_number: (result as GovernanceRelayResult).block_number,
    network: (result as GovernanceRelayResult).network,
  });
  sDispatch.ok({ tx_hash: (result as GovernanceRelayResult).tx_hash });
  return result as GovernanceRelayResult;
}
