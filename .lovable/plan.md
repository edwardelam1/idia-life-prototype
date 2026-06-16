# OZ v5 castVoteBySig Alignment

The deployed Governor is OpenZeppelin v5. Its `castVoteBySig` signature is `(uint256 proposalId, uint8 support, address voter, bytes signature)` — not the v4 `(uint256, uint8, uint8 v, bytes32 r, bytes32 s)` currently encoded everywhere. The empty revert on a well-formed payload is the classic missing-selector signature.

## Files to change

### 1. `supabase/functions/relay-governance-action/index.ts`
- Line 21 (`GOVERNOR_ABI`): replace v4 fragment with
  `"function castVoteBySig(uint256 proposalId, uint8 support, address voter, bytes signature) returns (uint256)"`.
- STAGE 1 payload parsing: accept a single `signature` hex string. Drop all `signatureV` / `signatureR` / `signatureS` extraction, validation, and null-checks.
- STAGE 4 (~line 595–612): update both the typed-method call and the explicit `ethers.Interface` encoder to use the v5 fragment. Pass `[onchainId, supportValue, preflightAddr, signature]`.
- Keep `[GOV_VOTE][ALIGNMENT][...]` and `[GOV_VOTE][RELAY_BROADCAST][...]` log tags; just update payload shape they print.
- EIP-712 signing/recovery is unchanged (`Ballot{proposalId, support}` still produces the same digest; v5 only changes how the signature is delivered on-chain).

### 2. `src/services/governanceRelay.ts`
- Line 53–58: replace v4 fragment + encoder with v5 fragment, encoding `[proposalId, support, voter, signature]` where `signature` is the raw 65-byte hex string from the wallet (`ethers.Signature.from(...).serialized` or the wallet's returned hex).
- In `verifiedHttpBody`: remove `v`, `r`, `s` fields; add `signature: rawSignatureString` and `voter: signerAddress`.

### 3. `src/services/governanceService.ts`
- Line 85 (ABI list): swap fragment to v5 form.
- Lines 678–700 (`compileStrictCastVoteBySigRelayPayload`): switch encoder to v5, build `signature` from the EIP-712 signing result, drop `v/r/s` from the outgoing relay body, add `signature` + `voter`.

### 4. `src/config/contracts.ts`
- Update `GOVERNOR_ABI` `castVoteBySig` entry to the v5 `(uint256, uint8, address, bytes)` form so local gas estimation matches the on-chain selector.

## What stays the same
- EIP-712 domain resolution via `getGovernorEip712Domain()` (chain-truth) — unchanged.
- `Ballot` typed-data struct `{proposalId: uint256, support: uint8}` — identical between v4 and v5.
- `propose()` path, delegation path, edge function auth, service-role usage, UI release-gate flags — untouched.

## Verification
1. Cast a vote on an active proposal.
2. Confirm new `[GOV_VOTE][ALIGNMENT][SUCCESS]` log shows 4-arg payload `[proposalId, support, voter, signature(0x…130 hex chars)]`.
3. Confirm `[GOV_VOTE][RELAY_BROADCAST][SUCCESS]` fires with a real tx hash (no empty revert).
4. If it still reverts, the next diagnostic is on-chain `hasVoted`/`proposalSnapshot` checks — not selector mismatch.
