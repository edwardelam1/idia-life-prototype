# Fix: `CHAIN_MISSING_ID` after successful propose tx

## Root cause

The on-chain `propose()` call succeeds (tx hash returned, no revert). The frontend log proves it:

```
[PROPOSAL_SUBMIT][RELAY_DISPATCH][SUCCESS] On-chain proposal initialized successfully.
[DEBUG_TX_LOGS] Event Parsed: undefined
[PROPOSAL_SUBMIT][MODAL_DISPATCH][SUCCESS] ... proposalId: undefined
```

`extractProposalIdFromReceipt()` walks `receipt.logs` and calls `govInterface.parseLog(...)` against `GOVERNOR_ABI` from `src/config/contracts.ts`. That ABI (lines 137–155) contains **only function fragments — no events**. With no `ProposalCreated` event in the interface, `parseLog` returns `null` for every log, so `proposalId` is never populated. The modal then trips its `CHAIN_MISSING_ID` hard gate and rejects the write to `dao_proposals`, even though the proposal is live on-chain.

This is not a payload/selector problem — the previous 4-arg selector fix (`0x7d5e81e2`) is working correctly. This is purely a receipt-decoding gap.

## Fix

Two small, surgical changes in `src/config/contracts.ts` and `src/services/governanceService.ts`. No edge function, no DB, no UI changes.

### 1. `src/config/contracts.ts` — add the OZ v4 ProposalCreated event to `GOVERNOR_ABI`

Append the canonical OpenZeppelin v4 Governor event signature so `ethers.Interface` can decode it:

```
"event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
```

(OZ v4 emits a `string[] signatures` field that is always empty for the 4-arg `propose`, but the event topic/data layout requires it for correct ABI decoding.)

### 2. `src/services/governanceService.ts` — add a deterministic fallback in `extractProposalIdFromReceipt()`

Even with the event in the ABI, add a safety net so we never again return `undefined` from a successful tx:

- Keep the existing log-parse loop (now it will actually match `ProposalCreated`).
- If no `ProposalCreated` is found, compute the proposalId locally using the OZ v4 formula:
  `keccak256(abi.encode(targets, values, calldatas, keccak256(bytes(description))))` → `BigInt` → string.
- Use `ethers.AbiCoder.defaultAbiCoder().encode([...], [...])` + `ethers.keccak256` to compute it. This matches `Governor.hashProposal(...)` 1:1.
- The function needs the original `targets / values / calldatas / description` to compute the fallback, so pass them through from `propose()` and `proposeWithTiming()` into `extractProposalIdFromReceipt()` (extend its signature).

Keep all existing `[DEBUG_TX_LOGS]` and `[PROPOSAL_SUBMIT]` log lines; add one new line on the fallback branch:
`console.log("[DEBUG_TX_LOGS] proposalId derived via hashProposal fallback:", id);`

## Why this is safe

- ABI-level event addition cannot affect on-chain behavior.
- The fallback only runs when event decoding fails, and it produces the exact same id the Governor contract assigns (`hashProposal` is deterministic on OZ v4).
- The `CHAIN_MISSING_ID` gate in `CreateDaoProposalModal.tsx` stays in place — it just stops false-firing.

## Out of scope

- No changes to `propose()` payload, selector, or 4-arg enforcement.
- No changes to `relay-governance-action` edge function.
- No changes to vote-relay path.
