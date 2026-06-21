## Diagnosis

`0x94ab6c07` = `GovernorInvalidSignature(address)` (OZ v4.9). Forensic of the on-chain calldata shows the Governor is v4.9 with the **5-arg** `castVoteBySig(uint256, uint8, uint8, bytes32, bytes32)` (selector `0x3bccf4fd`), and `v` is being delivered as `1`. Solidity's `ecrecover` rejects `v ∈ {0,1}` and returns the zero address, which the contract compares against the expected voter and reverts with `GovernorInvalidSignature`.

Today both `relay-governance-action` and `governanceRelay.ts` encode the **v5 4-arg** variant `castVoteBySig(uint256,uint8,address,bytes)`. We must abandon that path and switch to the v4.9 5-arg ABI everywhere, normalizing `v` before broadcast.

## Changes

### 1. `src/config/contracts.ts` — `GOVERNOR_ABI`
- Replace the current `castVoteBySig` entry with the v4.9 5-arg signature:
  `"function castVoteBySig(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) returns (uint256)"`
- Append `"error GovernorInvalidSignature(address voter)"` so ethers can decode reverts instead of printing `0x94ab6c07`.

### 2. `supabase/functions/relay-governance-action/index.ts`
- Replace the inline 4-arg `fragment` and `iface.encodeFunctionData("castVoteBySig", [onchainId, supportValue, preflightAddr, signatureHex])` block with a 5-arg call.
- Extract `v, r, s` from `signatureHex` via `ethers.Signature.from(signatureHex)`.
- Normalize `v`:
  ```ts
  let normalizedV = Number(sig.v);
  if (normalizedV === 0) normalizedV = 27;
  if (normalizedV === 1) normalizedV = 28;
  console.log(`[GOV_RELAY][STANDARD_VOTE][NORMALIZE] Adjusted v from ${sig.v} to ${normalizedV}`);
  ```
- Broadcast via the contract object (no manual `sendTransaction` needed):
  `tx = await gov.castVoteBySig(onchainId, supportValue, normalizedV, sig.r, sig.s);`
- Update the local `GOVERNOR_ABI` declaration at the top of the file (line 21) to the v4.9 5-arg signature AND add `"error GovernorInvalidSignature(address voter)"`.
- Update log strings that currently say "OZ v5 selector" to "OZ v4.9 5-arg selector" to avoid future misdiagnosis.

### 3. `src/services/governanceRelay.ts` (`relayCastVoteBySig`)
- The fragment at line 55 and `encodeFunctionData` block at line 59 are dead-code reference encoders (the edge function re-encodes). Still update them to the v4.9 5-arg form for consistency, and import `ethers.Signature.from` to derive `v/r/s` from `params.rawSignatureString` purely for the local console preview log.
- Keep the existing HTTP body unchanged (it already forwards `signature` as the full hex string; the edge function will split + normalize).

### 4. `src/services/governanceService.ts`
- `signBallot` already returns `{ signature, v, r, s, signerAddress }` from `ethers.Signature.from(signature)`. No on-chain behavior change needed here; ethers v6 already returns `v` as 27/28, but the relayer will normalize regardless as a defense-in-depth.
- No edits required unless we want to surface a console line confirming `v ∈ {27,28}` before posting; optional.

### 5. UI surfacing (already covered by `.lovable/plan.md`)
- The existing scoped edit at `src/components/governance/ActiveProposalsList.tsx` lines 735–758 will now decode `GovernorInvalidSignature` by name (because the ABI knows it), so the "Signature mismatch (0x94ab6c07)…" branch can match on either `customPayload.decoded_error === "GovernorInvalidSignature"` OR `error_selector === "0x94ab6c07"`. Add the name check to that branch for forward compatibility.

## Verification
1. Sign and broadcast a standard (non-tophat) vote on Base Mainnet from the preview.
2. Confirm in the edge-function logs:
   - `[GOV_RELAY][STANDARD_VOTE][NORMALIZE] Adjusted v from {0|1} to {27|28}`
   - `[GOV_RELAY][STANDARD_VOTE][AWAIT_CONFIRMATION][SUCCESS] Block …`
3. Confirm in the browser console that no `0x94ab6c07` selector is logged; the proposal's For/Against tally increments.
4. If revert still occurs, the new ABI will print `GovernorInvalidSignature(<voter>)` plainly, isolating any remaining domain-separator drift.

## Out of scope
- EIP-712 domain construction in `signBallot` (already pulled live from `eip712Domain()` on chain).
- Tophat `castVote` override path (unaffected).
- `wallet-gas-drip` and onboarding provisioning flow.
