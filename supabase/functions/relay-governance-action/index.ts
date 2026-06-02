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
import { ethers } from "npm:ethers@6.13.0";

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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
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

    console.log(
      `[GOV_RELAY][${stage}][HEADERS] method=${req.method} content-type=${req.headers.get("content-type")} content-length=${req.headers.get("content-length")}`,
    );
    console.log(`[GOV_RELAY][${stage}][AWAIT_JSON_START] Awaiting req.json()`);
    let body: any;
    try {
      body = await withTimeout(req.json(), 10_000, "req.json()");
      console.log(`[GOV_RELAY][${stage}][AWAIT_JSON_END] Successfully parsed body`);
    } catch (e: any) {
      console.error(`[GOV_RELAY][${stage}][JSON_ERROR]`, e?.message || e);
      return jsonResponse({ error: "Invalid JSON body", failed_at: stage }, 400);
    }
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

    // CANCEL_PROPOSAL-specific validation
    if (actionType === "CANCEL_PROPOSAL") {
      if (!title || typeof title !== "string") {
        return jsonResponse({ error: "Missing proposal title", failed_at: stage }, 400);
      }
      if (!description || typeof description !== "string") {
        return jsonResponse({ error: "Missing proposal description", failed_at: stage }, 400);
      }
      if (!acaHash || typeof acaHash !== "string") {
        return jsonResponse({ error: "Missing acaHash", failed_at: stage }, 400);
      }
      if (!acaPayload || typeof acaPayload !== "object") {
        return jsonResponse({ error: "Missing acaPayload", failed_at: stage }, 400);
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
    console.log(`[GOV_RELAY][${stage}][AWAIT_CLAIMS_START]`);
    const { data: claimsData, error: claimsError } = await withTimeout(
      supabaseAdmin.auth.getClaims(token),
      8_000,
      "auth.getClaims()",
    );
    console.log(`[GOV_RELAY][${stage}][AWAIT_CLAIMS_END] error=${!!claimsError}`);
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
    console.log(`[GOV_RELAY][RPC_SETUP][URL] using=${rpcUrl.includes("alchemy") ? "alchemy" : "public-base"}`);
    const relayerKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!relayerKey) {
      return jsonResponse({ error: "RELAYER_PRIVATE_KEY unbound.", failed_at: stage }, 500);
    }

    console.log(`[GOV_RELAY][RPC_SETUP][PROVIDER_INIT_START]`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`[GOV_RELAY][RPC_SETUP][PROVIDER_INIT_END]`);

    console.log(`[GOV_RELAY][RPC_SETUP][WALLET_BIND_START]`);
    const relayerWallet = new ethers.Wallet(relayerKey, provider);
    console.log(`[GOV_RELAY][RPC_SETUP][WALLET_BIND_END] address=${relayerWallet.address}`);

    console.log(`[GOV_RELAY][RPC_SETUP][GET_BALANCE_START]`);
    const gasBalance = await withTimeout(
      provider.getBalance(relayerWallet.address),
      8_000,
      "provider.getBalance()",
    );
    console.log(`[GOV_RELAY][RPC_SETUP][GET_BALANCE_END] balance=${ethers.formatEther(gasBalance)} ETH`);
    if (gasBalance === 0n) {
      return jsonResponse({ error: "Relayer wallet has no gas funds.", failed_at: stage }, 500);
    }
    console.log(`[GOV_RELAY][${stage}][SUCCESS] Provider and wallet bound.`);

    // ════════════════════════════════════════════════════════════════════════
    // BRANCH: CANCEL_PROPOSAL (only the proposer may cancel while Pending)
    // ════════════════════════════════════════════════════════════════════════
    if (actionType === "CANCEL_PROPOSAL") {
      const TAG = "CANCEL_PROPOSAL";

      // STAGE 3.5: AUTHORIZE — DB row ownership + Governor state + Relayer proposer parity
      stage = "AUTHORIZE_CANCEL";
      console.log(`[GOV_RELAY][${TAG}][${stage}][START] proposalId=${onchainId} user=${userId}`);

      const { data: row, error: rowErr } = await supabaseAdmin
        .from("dao_proposals")
        .select("id, proposer_id, on_chain_id, proposal_targets, proposal_values, proposal_calldatas")
        .eq("on_chain_id", onchainId.toString())
        .maybeSingle();
      if (rowErr) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] dao_proposals lookup failed: ${rowErr.message}`);
        return jsonResponse({ error: "Proposal lookup failed.", failed_at: stage }, 500);
      }
      const { data: indexedRow, error: indexedErr } = !row
        ? await supabaseAdmin
            .from("governance_proposals")
            .select("proposal_id, proposer, targets, callvalues, calldatas, description")
            .eq("proposal_id", onchainId.toString())
            .maybeSingle()
        : { data: null, error: null };
      if (indexedErr) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] governance_proposals lookup failed: ${indexedErr.message}`);
        return jsonResponse({ error: "Indexed proposal lookup failed.", failed_at: stage }, 500);
      }
      if (!row && !indexedRow) {
        return jsonResponse({ error: "Proposal not found in ledger.", failed_at: stage }, 404);
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("wallet_address")
        .eq("id", userId)
        .maybeSingle();
      const requesterWallet = String(profile?.wallet_address || "").toLowerCase();
      const indexedProposer = String(indexedRow?.proposer || "").toLowerCase();
      if (row?.proposer_id !== userId && (!indexedProposer || indexedProposer !== requesterWallet)) {
        return jsonResponse({ error: "Only the proposer may cancel this proposal.", failed_at: stage }, 403);
      }

      const govRead = new ethers.Contract(networkConfig.governor, GOVERNOR_ABI, provider);
      let chainState: number;
      let onchainProposer: string;
      try {
        console.log(`[GOV_RELAY][${TAG}][CONTRACT_READ][START] state(${onchainId}) + proposalProposer(${onchainId})`);
        const [s, p] = await withTimeout(
          Promise.all([
            govRead.state(onchainId),
            govRead.proposalProposer(onchainId),
          ]),
          10_000,
          "governor.state+proposer",
        );
        chainState = Number(s);
        onchainProposer = String(p);
        console.log(`[GOV_RELAY][${TAG}][CONTRACT_READ][END] state=${chainState} proposer=${onchainProposer}`);
      } catch (readErr: any) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] chain read failed: ${readErr.message}`);
        return jsonResponse({ error: "Could not read proposal state on-chain.", failed_at: stage }, 502);
      }
      if (chainState !== 0) {
        return jsonResponse(
          { error: `Proposal is no longer in Pending (state=${chainState}). Cancellation window closed.`, failed_at: stage },
          409,
        );
      }
      if (onchainProposer.toLowerCase() !== relayerWallet.address.toLowerCase()) {
        return jsonResponse(
          { error: "Relayer is not the on-chain proposer. Cancellation refused.", failed_at: stage },
          409,
        );
      }
      console.log(`[GOV_RELAY][${TAG}][${stage}][SUCCESS] state=0, proposer parity OK`);

      // STAGE 4: REBUILD_ARGS — prefer stored arrays, fall back to signaling defaults
      stage = "REBUILD_ARGS";
      const storedTargets = Array.isArray(row?.proposal_targets)
        ? row.proposal_targets
        : Array.isArray(indexedRow?.targets) ? indexedRow.targets : null;
      const storedValues = Array.isArray(row?.proposal_values)
        ? row.proposal_values
        : Array.isArray(indexedRow?.callvalues) ? indexedRow.callvalues.map((v: unknown) => String(v)) : null;
      const storedCalldatas = Array.isArray(row?.proposal_calldatas)
        ? row.proposal_calldatas
        : Array.isArray(indexedRow?.calldatas) ? indexedRow.calldatas : null;

      const hasStored = !!(storedTargets && storedValues && storedCalldatas
        && storedTargets.length > 0
        && storedTargets.length === storedValues.length
        && storedTargets.length === storedCalldatas.length);

      const targets: string[] = hasStored ? storedTargets! : [IDIA_TOKEN_ADDRESS];
      const values: bigint[] = hasStored
        ? storedValues!.map((v: string) => BigInt(v))
        : [0n];
      const calldatas: string[] = hasStored ? storedCalldatas! : ["0x"];

      const originalDescription = indexedRow?.description || (row
        ? `# ${title}\n\n${description}\n\n---\n*System Ref: ${row.id}*`
        : String(description || ""));
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(originalDescription));
      console.log(
        `[GOV_RELAY][${TAG}][${stage}] mode=${hasStored ? "stored" : "defaults"} arity=${targets.length} descHash=${descriptionHash.substring(0, 10)}…`,
      );

      // STAGE 5: BROADCAST_TRANSACTION
      stage = "BROADCAST_TRANSACTION";
      const gov = new ethers.Contract(networkConfig.governor, GOVERNOR_ABI, relayerWallet);
      let tx;
      try {
        tx = await gov.cancel(targets, values, calldatas, descriptionHash);
      } catch (txErr: any) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] cancel() reverted: ${txErr.message}`);
        return jsonResponse(
          { error: "Governor rejected cancel(). Arguments may not match the original propose().", failed_at: stage, detail: txErr.shortMessage || txErr.message },
          500,
        );
      }
      console.log(`[GOV_RELAY][${TAG}][${stage}] Tx submitted: ${tx.hash}`);

      stage = "AWAIT_CONFIRMATION";
      const receipt = await tx.wait();
      console.log(`[GOV_RELAY][${TAG}][${stage}][SUCCESS] Block ${receipt.blockNumber}`);

      // STAGE 6: RECONCILE_DATABASE — flip row + ACA ledger + audit log
      stage = "RECONCILE_DATABASE";
      const { error: updErr } = row
        ? await supabaseAdmin
            .from("dao_proposals")
            .update({ status: "cancelled", lifecycle_phase: "cancelled" })
            .eq("id", row.id)
        : await supabaseAdmin
            .from("governance_proposals")
            .update({ state: 2, state_name: "Canceled" })
            .eq("proposal_id", onchainId.toString());
      if (updErr) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] proposal update failed: ${updErr.message}`);
      }

      try {
        const { recordACA } = await import("../_shared/recordACA.ts");
        await recordACA(supabaseAdmin, {
          userId,
          sourceId: "GOV_PROPOSAL_CANCEL",
          consentType: "governance_cancel",
          hash: acaHash,
          payload: acaPayload,
          txHash: tx.hash,
        });
      } catch (acaErr: any) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] recordACA failed: ${acaErr.message}`);
      }

      try {
        await supabaseAdmin.from("transactions").insert({
          user_id: userId,
          transaction_type: "governance_cancel",
          amount: 0,
          description: `Cancelled proposal ${onchainId}`,
          metadata: {
            tx_hash: tx.hash,
            block_number: receipt.blockNumber,
            target_contract: networkConfig.governor,
            proposal_id: onchainId.toString(),
            action_type: actionType,
            chain_id: networkId,
            network: networkConfig.name,
            relayed_by: relayerWallet.address,
            arg_mode: hasStored ? "stored" : "defaults",
            arg_arity: targets.length,
            aca_hash: acaHash,
          },
        });
      } catch (auditErr: any) {
        console.error(`[GOV_RELAY][${TAG}][${stage}] transactions insert failed: ${auditErr.message}`);
      }
      console.log(`[GOV_RELAY][${TAG}][${stage}][SUCCESS] Cancellation reconciled.`);

      return jsonResponse({
        success: true,
        mode: "cancel_proposal",
        tx_hash: tx.hash,
        block_number: receipt.blockNumber,
        target_contract: networkConfig.governor,
        network: networkConfig.name,
      });
    }

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
