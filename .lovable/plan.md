# Plan: Decode Governor Custom Errors + Isolate Per-Wallet Reverts

The relayer hit selector `0x94ab6c07` (arg = wallet `0x429F…`) and logged it as "unknown custom error" because the Governor ABI in `relay-governance-action/index.ts` and `src/config/contracts.ts` only contains function fragments — no `error` fragments. Result: ethers can't decode the revert, and a single bad wallet stalls the whole flow.

## Changes

### 1. `supabase/functions/relay-governance-action/index.ts` — extend `GOVERNOR_ABI`

Add the full OpenZeppelin v5 Governor custom-error set so `error.revert.name` / `error.revert.args` populate correctly. This covers `0x94ab6c07` regardless of which OZ error it actually maps to, plus every other revert path we care about:

```ts
const GOVERNOR_ABI = [
  // …existing function fragments…
  "error GovernorAlreadyCastVote(address voter)",
  "error GovernorAlreadyQueuedProposal(uint256 proposalId)",
  "error GovernorDisabledDeposit()",
  "error GovernorInsufficientProposerVotes(address proposer, uint256 votes, uint256 threshold)",
  "error GovernorInvalidProposalLength(uint256 targets, uint256 calldatas, uint256 values)",
  "error GovernorInvalidQuorumFraction(uint256 quorumNumerator, uint256 quorumDenominator)",
  "error GovernorInvalidSignature(address voter)",
  "error GovernorInvalidVoteParams()",
  "error GovernorInvalidVoteType()",
  "error GovernorInvalidVotingPeriod(uint256 votingPeriod)",
  "error GovernorNonexistentProposal(uint256 proposalId)",
  "error GovernorNotQueuedProposal(uint256 proposalId)",
  "error GovernorOnlyExecutor(address account)",
  "error GovernorOnlyProposer(address account)",
  "error GovernorQueueNotImplemented()",
  "error GovernorRestrictedProposer(address proposer)",
  "error GovernorUnexpectedProposalState(uint256 proposalId, uint8 current, bytes32 expectedStates)",
  "error QueueEmpty()",
  "error QueueFull()",
];
```

### 2. `relay-governance-action/index.ts` — granular try/catch around the CAST_VOTE broadcast (lines ~593–620)

Wrap the `castVote` / `sendTransaction` + `tx.wait()` block so a contract revert returns a structured 409 with the decoded error name, instead of bubbling out as a 5xx stall:

```ts
try {
  if (overrideAuthorized) {
    tx = await gov.castVote(onchainId, supportValue);
  } else {
    // existing castVoteBySig sendTransaction path
  }
  console.log(`[GOV_RELAY][${tag}][BROADCAST_TRANSACTION] Tx submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[GOV_RELAY][${tag}][AWAIT_CONFIRMATION][SUCCESS] Block ${receipt.blockNumber}`);
} catch (err: any) {
  const decoded =
    err?.revert?.name ??
    err?.errorName ??
    (err?.data && err.data.startsWith("0x") ? err.data.slice(0, 10) : null);
  const decodedArgs = err?.revert?.args ? Array.from(err.revert.args).map(String) : [];
  console.error(
    `[GOV_RELAY][${tag}][FATAL_STALL] Governor rejected vote for ${preflightAddr}. ` +
    `Reason: ${decoded ?? "Unknown"} args=[${decodedArgs.join(",")}] raw=${err?.shortMessage ?? err?.message}`,
  );
  return jsonResponse(
    {
      error: "Governor reverted the vote transaction.",
      failed_at: "BROADCAST_TRANSACTION",
      decoded_error: decoded,
      decoded_args: decodedArgs,
      voter: preflightAddr,
      detail: err?.shortMessage ?? err?.message,
    },
    409, // Conflict — wallet state desync, not relayer failure
  );
}
```

The same pattern is added to the `gov.cancel()` block (lines ~396–405) to keep behavior symmetric.

### 3. `src/config/contracts.ts` — mirror the error fragments

Append the identical `error …` entries to `GOVERNOR_ABI` so client-side `estimateGas` / read-call decoders surface the same human-readable name in dev tools and `signBallot()` pre-flight logs.

### 4. Off-chain ledger reconciliation for wallet `0x429F7fd3…` — read-only first

Not bundled into the code patch. After deploy, run a read-only sweep against Base mainnet for that wallet on `0x9777067CAd2892D20decAF1a5ccb78e6B291B87a`:

- `governor.hasVoted(proposalId, 0x429F…)` — confirms double-vote case.
- If `true`, mark the matching `dao_votes` / `governance_ledger` row as `status='completed'` via a targeted migration so the worker loop stops re-queuing.
- If `false`, the revert is a different error (snapshot weight, state, etc.) — the new decoded log line will tell us which, and we fix the gating instead of the ledger.

The migration is intentionally **not** in this plan — it depends on what the decoded error actually says once the ABI is complete.

## Out of scope

- EIP-712 domain logic, `castVoteBySig` 4-arg encoding, signing pipeline — all already correct from the previous patch.
- No changes to `governanceService.ts` or `governanceRelay.ts` (no broadcast happens there; the client only signs and forwards).
- No migration in this pass — gather the decoded reason first.

## Verification

1. After deploy, trigger the failing vote again. Edge-function log must now show `Reason: <ErrorName> args=[0x429f…]` instead of `unknown custom error`.
2. Response to the client is `409` with `decoded_error` populated — relayer loop continues for other wallets.
3. Use the decoded name to decide whether to write the reconciliation migration or fix a pre-flight gate.
