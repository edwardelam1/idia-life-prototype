/**
 * relay-governance-action
 *
 * Relayer-First Governance: routes authenticated UI commands to an on-chain
 * approveAndExecute() call signed by RELAYER_PRIVATE_KEY on Base Mainnet.
 *
 * Mirrors the structural pattern of relay-usdc-transfer with stage-tagged
 * logging so Apple App Review (and our own ops) can trace every step.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.0";

const ESCROW_ABI = [
  "function approveAndExecute(uint256 proposalId) external returns (bool)",
];

const GOVERNOR_ABI = [
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalProposer(uint256 proposalId) view returns (address)",
  "function cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
];

// Default fallback target for basic signaling proposals — matches
// governanceService.propose() defaults so descriptionHash + arrays line up.
const IDIA_TOKEN_ADDRESS = "0x6526F939D257E67896821c25B6C24Daa404a01FB";

const NETWORKS: Record<
  number,
  { rpcUrlFallback: string; targets: Record<string, string>; governor: string; name: string }
> = {
  8453: {
    name: "Base",
    rpcUrlFallback: "https://mainnet.base.org",
    governor: "0x9777067CAd2892D20decAF1a5ccb78e6B291B87a",
    targets: {
      team: "0xF0E67683783ef5879b43ef99ab04Bc27A9a71074",
      ecosystem: "0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708",
    },
  },
};

const ALLOWED_ACTIONS = new Set(["APPROVE_AND_EXECUTE", "CAST_VOTE", "CANCEL_PROPOSAL"]);
const ALLOWED_TARGETS = new Set(["team", "ecosystem"]);
// L3 Tophat clearance — hat types that may carry the vote with Treasury weight
const TOPHAT_HAT_TYPES = ["tophat", "security_council", "admin"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log("[GOV_RELAY][INIT] Inbound governance relay request received.");
  let stage = "INITIALIZATION";

  try {
    // ─── STAGE 1: PARSE_REQUEST ─────────────────────────────────────────────
    stage = "PARSE_REQUEST";
    console.log(`[GOV_RELAY][${stage}][START] Validating headers and body payload.`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing user authentication token.", failed_at: stage }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const {
      actionType,
      escrowTarget,
      proposalId,
      chainId,
      actionId,
      support,
      voteWeight,
      tophatOverride,
      acaHash,
      acaPayload,
      title,
      description,
    } = body ?? {};

    if (!actionType || !ALLOWED_ACTIONS.has(actionType)) {
      return jsonResponse({ error: `Invalid actionType: ${actionType}`, failed_at: stage }, 400);
    }
    if (actionType === "APPROVE_AND_EXECUTE" && (!escrowTarget || !ALLOWED_TARGETS.has(escrowTarget))) {
      return jsonResponse({ error: `Invalid escrowTarget: ${escrowTarget}`, failed_at: stage }, 400);
    }
    if (proposalId === undefined || proposalId === null) {
      return jsonResponse({ error: "Missing proposalId", failed_at: stage }, 400);
    }
    let onchainId: bigint;
    try {
      onchainId = BigInt(proposalId);
    } catch {
      return jsonResponse({ error: `proposalId must be numeric: ${proposalId}`, failed_at: stage }, 400);
    }
    const networkId = Number(chainId ?? 8453);
    if (networkId !== 8453) {
      return jsonResponse({ error: `Unsupported chainId: ${networkId}`, failed_at: stage }, 400);
    }

    // CAST_VOTE-specific validation
    let supportValue: 0 | 1 | 2 = 0;
    let voteWeightNum = 0;
    if (actionType === "CAST_VOTE") {
      if (support !== 0 && support !== 1 && support !== 2) {
        return jsonResponse({ error: `Invalid support value: ${support}`, failed_at: stage }, 400);
      }
      supportValue = support as 0 | 1 | 2;
      voteWeightNum = Number(voteWeight);
      if (!Number.isFinite(voteWeightNum) || voteWeightNum <= 0) {
        return jsonResponse({ error: `Invalid voteWeight: ${voteWeight}`, failed_at: stage }, 400);
      }
      if (!acaHash || typeof acaHash !== "string") {
        return jsonResponse({ error: "Missing acaHash", failed_at: stage }, 400);
      }
    }
    console.log(
      `[GOV_RELAY][${stage}][SUCCESS] action=${actionType} proposalId=${onchainId} chainId=${networkId} override=${!!tophatOverride}`,
    );

    // ─── STAGE 2: VERIFY_IDENTITY ───────────────────────────────────────────
    stage = "VERIFY_IDENTITY";
    console.log(`[GOV_RELAY][${stage}][START] Confirming session validity via Supabase Auth.`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Session verification failed.", failed_at: stage }, 401);
    }
    const userId = claimsData.claims.sub;
    console.log(`[GOV_RELAY][${stage}][SUCCESS] Authorized user ${userId}`);

    // ─── STAGE 3: CONNECT_BLOCKCHAIN ────────────────────────────────────────
    stage = "CONNECT_BLOCKCHAIN";
    console.log(`[GOV_RELAY][${stage}][START] Initializing JSON-RPC provider.`);

    const networkConfig = NETWORKS[networkId]!;
    const rpcUrl = Deno.env.get("ALCHEMY_BASE_RPC_URL") || networkConfig.rpcUrlFallback;
    const relayerKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!relayerKey) {
      return jsonResponse({ error: "RELAYER_PRIVATE_KEY unbound.", failed_at: stage }, 500);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayerWallet = new ethers.Wallet(relayerKey, provider);
    const gasBalance = await provider.getBalance(relayerWallet.address);
    console.log(`[GOV_RELAY][${stage}] Relayer ${relayerWallet.address}`);
    console.log(`[GOV_RELAY][${stage}] Gas balance ${ethers.formatEther(gasBalance)} ETH`);
    if (gasBalance === 0n) {
      return jsonResponse({ error: "Relayer wallet has no gas funds.", failed_at: stage }, 500);
    }
    console.log(`[GOV_RELAY][${stage}][SUCCESS] Provider and wallet bound.`);

    // ════════════════════════════════════════════════════════════════════════
    // BRANCH: CAST_VOTE (standard or Tophat Override)
    // ════════════════════════════════════════════════════════════════════════
    if (actionType === "CAST_VOTE") {
      // STAGE 3.5: ROLE_CHECK (only when override requested — never trust client flag)
      let overrideAuthorized = false;
      if (tophatOverride === true) {
        stage = "ROLE_CHECK";
        console.log(`[GOV_RELAY][TOPHAT_OVERRIDE][${stage}][START] Validating L3 clearance for ${userId}`);
        const { data: hats, error: hatsErr } = await supabaseAdmin
          .from("dao_hats")
          .select("hat_type")
          .eq("user_id", userId)
          .eq("eligibility_status", "active")
          .is("revoked_at", null)
          .in("hat_type", TOPHAT_HAT_TYPES);
        if (hatsErr) {
          console.error(`[GOV_RELAY][TOPHAT_OVERRIDE][${stage}] dao_hats query failed: ${hatsErr.message}`);
          return jsonResponse({ error: "Role verification failed.", failed_at: stage }, 500);
        }
        if (!hats || hats.length === 0) {
          console.warn(`[GOV_RELAY][TOPHAT_OVERRIDE][${stage}][DENIED] user ${userId} lacks L3 hat`);
          return jsonResponse(
            { error: "Tophat clearance required to carry the vote.", failed_at: stage },
            403,
          );
        }
        overrideAuthorized = true;
        console.log(`[GOV_RELAY][TOPHAT_OVERRIDE][${stage}][SUCCESS] hats=${hats.map((h: any) => h.hat_type).join(",")}`);
      }

      // STAGE 4: BROADCAST_TRANSACTION — Treasury/Relayer wallet casts the vote
      stage = "BROADCAST_TRANSACTION";
      const tag = overrideAuthorized ? "TOPHAT_OVERRIDE" : "STANDARD_VOTE";
      console.log(
        `[GOV_RELAY][${tag}][${stage}][START] castVote(${onchainId}, ${supportValue}) -> ${networkConfig.governor}`,
      );
      const gov = new ethers.Contract(networkConfig.governor, GOVERNOR_ABI, relayerWallet);
      const tx = await gov.castVote(onchainId, supportValue);
      console.log(`[GOV_RELAY][${tag}][${stage}] Tx submitted: ${tx.hash}`);

      stage = "AWAIT_CONFIRMATION";
      const receipt = await tx.wait();
      console.log(`[GOV_RELAY][${tag}][${stage}][SUCCESS] Block ${receipt.blockNumber}`);

      // STAGE 6: RECONCILE_DATABASE
      stage = "RECONCILE_DATABASE";
      try {
        await supabaseAdmin.from("transactions").insert({
          user_id: userId,
          transaction_type: overrideAuthorized ? "governance_tophat_override" : "governance_vote",
          amount: 0,
          description: `Governance ${tag} on proposal ${onchainId}`,
          metadata: {
            tx_hash: tx.hash,
            block_number: receipt.blockNumber,
            target_contract: networkConfig.governor,
            proposal_id: onchainId.toString(),
            support: supportValue,
            vote_weight: voteWeightNum,
            tophat_override: overrideAuthorized,
            aca_hash: acaHash,
            action_type: actionType,
            chain_id: networkId,
            network: networkConfig.name,
            relayed_by: relayerWallet.address,
          },
        });
      } catch (auditErr: any) {
        console.error(`[GOV_RELAY][${tag}][${stage}] transactions insert failed: ${auditErr.message}`);
      }
      console.log(`[GOV_RELAY][${tag}][${stage}][SUCCESS] Reconciliation complete.`);

      return jsonResponse({
        success: true,
        mode: overrideAuthorized ? "tophat_override" : "standard_vote",
        tx_hash: tx.hash,
        block_number: receipt.blockNumber,
        target_contract: networkConfig.governor,
        network: networkConfig.name,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // BRANCH: APPROVE_AND_EXECUTE (existing escrow flow)
    // ════════════════════════════════════════════════════════════════════════
    // ─── STAGE 4: BROADCAST_TRANSACTION ─────────────────────────────────────
    stage = "BROADCAST_TRANSACTION";
    const targetContractAddress = networkConfig.targets[escrowTarget];
    console.log(
      `[GOV_RELAY][${stage}][START] approveAndExecute(${onchainId}) -> ${targetContractAddress}`,
    );

    const escrowContract = new ethers.Contract(targetContractAddress, ESCROW_ABI, relayerWallet);
    const tx = await escrowContract.approveAndExecute(onchainId);
    console.log(`[GOV_RELAY][${stage}] Tx submitted: ${tx.hash}`);

    // ─── STAGE 5: AWAIT_CONFIRMATION ────────────────────────────────────────
    stage = "AWAIT_CONFIRMATION";
    console.log(`[GOV_RELAY][${stage}][START] Awaiting receipt.`);
    const receipt = await tx.wait();
    console.log(`[GOV_RELAY][${stage}][SUCCESS] Block ${receipt.blockNumber}`);

    // ─── STAGE 6: RECONCILE_DATABASE ────────────────────────────────────────
    stage = "RECONCILE_DATABASE";
    console.log(`[GOV_RELAY][${stage}][START] Reconciling local DB state.`);

    if (actionId) {
      const { error: updErr } = await supabaseAdmin
        .from("dao_pending_actions")
        .update({
          status: "executed",
          tx_hash: tx.hash,
          processed_at: new Date().toISOString(),
        })
        .eq("id", actionId);
      if (updErr) console.error(`[GOV_RELAY][${stage}] dao_pending_actions update failed: ${updErr.message}`);
    }

    try {
      await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        transaction_type: "governance_execution",
        amount: 0,
        description: `Governance ${actionType} on ${escrowTarget}`,
        metadata: {
          tx_hash: tx.hash,
          block_number: receipt.blockNumber,
          target_contract: targetContractAddress,
          proposal_id: onchainId.toString(),
          action_type: actionType,
          escrow_target: escrowTarget,
          chain_id: networkId,
          network: networkConfig.name,
          relayed_by: relayerWallet.address,
        },
      });
    } catch (auditErr: any) {
      console.error(`[GOV_RELAY][${stage}] transactions insert failed: ${auditErr.message}`);
    }

    console.log(`[GOV_RELAY][${stage}][SUCCESS] Reconciliation complete.`);

    return jsonResponse({
      success: true,
      tx_hash: tx.hash,
      block_number: receipt.blockNumber,
      target_contract: targetContractAddress,
      network: networkConfig.name,
    });
  } catch (err: any) {
    console.error(`[GOV_RELAY][FAILED] at [${stage}]: ${err.message}`);
    return jsonResponse(
      { error: err.message || "Governance relay failed.", failed_at: stage },
      500,
    );
  }
});
