## Plan

1. **Patch the relayer preflight diagnostics**
   - In `supabase/functions/relay-governance-action/index.ts`, expand the standard vote preflight to log:
     - `proposalSnapshot(onchainId)`
     - `state(onchainId)` with a readable Governor state name
     - `hasVoted(onchainId, voter)`
     - voter snapshot weight
   - Use the IDIA token `getPastVotes(voter, snapshotBlock)` path for the explicit snapshot-weight diagnostic, while keeping a fallback to Governor `getVotes(voter, snapshotBlock)` if needed.
   - If snapshot weight is `0`, return a `409` with structured fields like `state_conflict: "zero_snapshot_power"`, `snapshot_block`, `snapshot_weight`, and `voter`.
   - If the voter already voted, return `state_conflict: "already_voted"`.
   - If proposal state is not `Active` (`1`), return `state_conflict: "inactive_proposal"` with the numeric and readable state.

2. **Force the standard vote broadcast past `estimateGas`**
   - Update only the standard `castVoteBySig` path to pass hardcoded gas bounds:
     ```ts
     await gov.castVoteBySig(onchainId, supportValue, normalizedV, sig.r, sig.s, {
       gasLimit: 300000,
     });
     ```
   - Add the requested log line:
     ```ts
     [GOV_RELAY][STANDARD_VOTE][BROADCAST] Forcing execution with hardcoded gas bounds.
     ```
   - Leave the Tophat override path unchanged unless it hits the same estimation issue later.

3. **Improve returned error payloads for UI/operator diagnosis**
   - Include the preflight state snapshot in revert responses when available:
     - `proposal_state`
     - `proposal_state_name`
     - `snapshot_block`
     - `snapshot_weight`
     - `already_voted`
   - Preserve existing `decoded_error`, `decoded_args`, and `error_selector` fields.

4. **Update frontend failure copy only where it consumes relay errors**
   - In `ActiveProposalsList.tsx`, map new `state_conflict` values to precise user-facing toasts:
     - zero snapshot power
     - already voted
     - inactive proposal / voting not open
   - Avoid writing any off-chain vote mirror unless the existing chain-truth poll confirms a tally change.

5. **Deploy edge function and verify logs**
   - Deploy `relay-governance-action` after the patch.
   - Check Supabase function logs for:
     - `[GOV_RELAY][STATE_CHECK] Voter weight at snapshot block ...`
     - `[GOV_RELAY][STANDARD_VOTE][BROADCAST] Forcing execution with hardcoded gas bounds.`
   - If it still reverts, the forced transaction should produce a BaseScan hash/revert trail or the structured preflight payload should identify the state conflict before spend.