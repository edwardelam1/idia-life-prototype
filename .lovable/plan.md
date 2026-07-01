## Root cause

The lifecycle telemetry list shows 4 rows as **Live Vote**, but only one lives on the current Governor (`0xc59120…773d9`). The other 3 were created against a previous Governor and their `on_chain_id` no longer resolves.

In `src/components/governance/LifecycleTelemetry.tsx` (lines ~305–329), when `readChainState(on_chain_id)` throws or returns `state = null`, the code falls back to the DB-stored `lifecycle_phase`, which for those 3 rows is still `"active"` — so they render as **⚡ Live Vote**. Meanwhile the detail dialog computes its deadline off `created_at + (voting_delay + voting_period) * 2s` and correctly reports **"Voting Closed · Deadline Passed"**. That's the contradiction the user is seeing.

## Fix (frontend-only, no DB / migration)

Reclassify any proposal whose on-chain id can't be resolved by the current Governor as archived instead of trusting the stale DB phase.

1. **`src/components/governance/LifecycleTelemetry.tsx`**
   - Add a new `PHASE_META` entry `archived` with icon `📦`, label `Archived · Legacy Governor`, neutral slate color.
   - Extend the `ProposalLite.lifecycle_phase` union with `"archived"`.
   - In the per-row mapping (`stateChecks`), when `r.on_chain_id` is set AND either the chain call throws OR returns `state === null`, return `{ lifecycle_phase: "archived", status: "Legacy Governor" }` instead of falling back to `dbPhaseFor(r)`. Proposals with no `on_chain_id` keep the current draft fallback.
   - Add `archived: 6` to the `order` map so these sink below active/pending/succeeded/queued/executed/draft.

2. **Detail dialog consistency** (same file)
   - When `proposal.lifecycle_phase === "archived"`, skip the naive `created_at + 7d` deadline math and render the deadline pill as `"Voting Closed · Legacy Governor"` with the `ended` (rose) tone. Prevents the same contradictory pairing from appearing inside the modal.

No other components read `lifecycle_phase === "archived"`, so nothing else needs to change. The one genuinely live proposal on the current Governor keeps returning `state === 1` and stays labeled **Live Vote**.
