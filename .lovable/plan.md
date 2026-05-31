# Add Missing Governor ABI Entries

`LifecycleTelemetry.tsx` and `ActiveProposalsList.tsx` call `gov.proposalSnapshot(id)` and `gov.quorum(block)` via `directQuorum()`, but `GOVERNOR_ABI` in `src/config/contracts.ts` does not declare these functions. Ethers throws on the call, leaving the quorum stuck at "pending".

## Change

**File:** `src/config/contracts.ts` — `GOVERNOR_ABI` array

Add two human-readable signatures:

```ts
"function proposalSnapshot(uint256 proposalId) view returns (uint256)",
"function quorum(uint256 blockNumber) view returns (uint256)",
```

That's the entire change. No other files need edits — the call sites already exist and will start resolving once the ABI knows the selectors.

## Verification

- Open a proposal in Lifecycle Telemetry → quorum value renders (not "…")
- Console shows `[QUORUM_DEBUG] Setting state liveQuorum: <number>` instead of an ethers "no matching function" error
- ActiveProposalsList cards display the dynamic threshold
