## Plan: Align EIP-712 Ballot with OpenZeppelin v5 (add voter + nonce)

The v5 `castVoteBySig` ABI call now executes on-chain but reverts with `GovernorInvalidSignature` because the frontend still signs the v4 Ballot struct `{proposalId, support}`. v5 requires `{proposalId, support, voter, nonce}` and uses the Governor's own `nonces(address)` for replay protection.

### 1. `src/config/contracts.ts`
- Add `"function nonces(address owner) view returns (uint256)"` to `GOVERNOR_ABI` so the frontend can read the Governor nonce (separate from the IDIA token nonce already exposed).

### 2. `src/services/governanceService.ts` — `signBallot`
- Before signing, instantiate a read-only Governor contract bound to the signer's provider and fetch the voter nonce:
  ```ts
  const govNonceRead = new ethers.Contract(PROTOCOL.governor, ["function nonces(address) view returns (uint256)"], provider);
  const voterNonce: bigint = await govNonceRead.nonces(signerAddress);
  ```
- Replace the Ballot type with the v5 layout:
  ```ts
  const types = {
    Ballot: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'voter', type: 'address' },
      { name: 'nonce', type: 'uint256' },
    ],
  };
  const value = {
    proposalId: proposalIdBig,
    support: Number(support),
    voter: signerAddress,
    nonce: voterNonce,
  };
  ```
- Keep the existing dynamic `eip712Domain()` truth fetch, the bigint guard, and the v/r/s decomposition unchanged.
- Add `[GOV_VOTE][SIGN_BALLOT][V5_PAYLOAD]` log with `voter` and `nonce.toString()` for auditability.

### 3. `supabase/functions/relay-governance-action/index.ts`
- Remove the `{ gasLimit: 300000 }` override on the standard `castVoteBySig` broadcast:
  ```ts
  tx = await gov.castVoteBySig(onchainId, supportValue, preflightAddr, finalSignatureHex);
  ```
- Keep the v-byte normalization (`00`/`01` → `1b`/`1c`), preflight snapshot/state/hasVoted checks, structured `state_conflict` payloads, and the `GovernorInvalidSignature` decoder.
- Leave the EIP-1559 fee bumping (if present) untouched; dynamic estimateGas resumes its role.

### 4. Deploy & verify
- Deploy `relay-governance-action`.
- Cast a fresh vote and confirm:
  - Browser logs show `[V5_PAYLOAD]` with the voter address and a numeric nonce.
  - Edge function logs show `[NORMALIZE]` then a successful broadcast without a revert.
  - On-chain `VoteCast` event appears on BaseScan and the tally updates in the UI.

### Out of scope
- No changes to `castVoteBySigWithReasonAndParams`, the delegation flow, or the relay HTTP body shape (still ships `signature`, `voterAddress`, `voter`).
- No ABI changes beyond adding `nonces(address)` to the Governor.
