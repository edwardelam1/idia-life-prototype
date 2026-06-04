# Vote relay diagnostic hardening

Good news up front: 2 of the 3 prescribed gates are already live. Only one new check is actually needed.

## What's already in place (no change)

- **Snapshot-block voting-power guard** — `ActiveProposalsList.tsx:649-665` already calls `govRead.getVotes(signerAddress, liveChain.snapshotBlock)`, blocks the vote with a "No voting power at snapshot" toast if it's `0n`, and logs `[GOV_VOTE][PRE_FLIGHT][END:FAIL] zero_snapshot_power …`. Nothing to add for point #2.
- **Already-voted guard** — `:668-680` short-circuits if `hasVoted` returns true.
- **Voting-state guard** — `:634-646` blocks if proposal state ≠ Active.
- **2-field OZ v4 `Ballot` struct** — `governanceService.ts:551-557` stays exactly as-is. No `voter`/`expiry` fields.

## What this plan changes

### 1. Client-side `ethers.verifyTypedData` round-trip (new)

In `src/services/governanceService.ts`, inside `signBallot(...)` immediately after `const signature = await signer.signTypedData(...)`:

- Call `ethers.verifyTypedData(domain, types, value, signature)` and compare lower-cased against `signerAddress`.
- On mismatch: log `🚨 [GOV_VOTE][PRE_FLIGHT][SIGN][FAIL] recovered=<x> expected=<y> governorName=<n> chainId=<c>` and throw `EIP-712 domain separator mismatch — local signature recovery failed.`
- On match: log `[GOV_VOTE][PRE_FLIGHT][SIGN][SUCCESS]`.

This catches a wrong `governorName` (e.g. `gov.name()` returns something other than the contract's hardcoded EIP712 name) **before** burning a relayer-side `estimateGas` call, and surfaces the real root cause in a single log line.

### 2. Relay-broadcast bookend logs (new)

In `ActiveProposalsList.tsx` around the `supabase.functions.invoke("relay-governance-action", …)` call (currently `:707-711`), wrap with:

- Before invoke: `console.log("[GOV_VOTE][RELAY_BROADCAST][START]", { proposalId, support: chainSupport, tophatOverride })`
- On success (`relayData?.success`): `console.log("[GOV_VOTE][RELAY_BROADCAST][SUCCESS]", { tx_hash: relayData.tx_hash })`
- On error (existing `relayErr || !relayData?.success` branch): `console.error("[GOV_VOTE][RELAY_BROADCAST][FATAL_FAIL]", raw)`

Existing `stage("GOV_UI", "RELAY_INVOKE")` tracer remains untouched alongside these.

## What this plan does NOT change

- `GOVERNOR_ABI` and the relay edge function — both correctly target OZ v4 `castVoteBySig(uint256,uint8,uint8,bytes32,bytes32)`.
- The `Ballot` typehash — adding `voter`/`expiry` would change the struct hash and break recovery for every vote. Confirmed in earlier exchange.
- The relayer hot wallet broadcasting on behalf of the user — that is the intended `castVoteBySig` design; signer ≠ msg.sender is correct.
- No edge-function changes, no DB migration, no UI restructuring.

## Files touched (2)

- `src/services/governanceService.ts` — add 6-10 lines inside `signBallot`.
- `src/components/governance/ActiveProposalsList.tsx` — add 3 bookend log lines around the relay invoke.

## Expected outcome

Next failed vote will produce **one** of these definitive signals in the console instead of the opaque `CALL_EXCEPTION`:

- `[GOV_VOTE][PRE_FLIGHT][SIGN][FAIL] recovered=0x000…000 …` → wrong `governorName`/domain → fix domain string.
- `[GOV_VOTE][PRE_FLIGHT][END:FAIL] zero_snapshot_power …` → user delegated after snapshot → already handled with a toast.
- `[GOV_VOTE][RELAY_BROADCAST][FATAL_FAIL] <raw governor revert>` → on-chain revert reason surfaced verbatim (e.g. `GovernorInvalidSignature`, `GovernorAlreadyCastVote`, quorum/threshold issue) → actionable next step.
