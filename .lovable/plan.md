# Fix: expired proposals & motions must archive everywhere

## Symptoms observed

1. A chain-anchored proposal shows **"Live Vote / Active"** in the Lifecycle Telemetry list while its own detail dialog already says **"Voting Closed · Deadline Passed"** and its quorum was never met. The same proposal correctly sits under **Defeated & Canceled** in the Active Proposals feed. Two surfaces disagree.
2. Two motions (no `on_chain_id`, live only in `dao_proposals` with an `end_date`) show as **"In Deliberation"** / **"Active"** in telemetry even though their `end_date` is in the past. They never appear in the archive.
3. Legacy-Governor motions (rows whose `on_chain_id` belongs to a decommissioned Governor) are not currently routed into the same archive bucket as proposals.

## Root cause

Two independent classifiers, neither one deadline-aware:

- `src/components/governance/ActiveProposalsList.tsx` → `classifyProposalBucket` / `classifyBucket` switch purely on the OZ Governor `state` integer. When the current block is past `proposalDeadline` but nobody has "poked" the Governor, `state()` can still return `1` (Active). Motions with no `on_chain_id` fall through to `deriveDbState` which never looks at `end_date`.
- `src/components/governance/LifecycleTelemetry.tsx` (list fetch, lines ~315–350) hard-maps chain `state === 1` → `active` / `"Live Vote"` and unknown DB phases → `draft` / `"In Deliberation"`, again with no `end_date` check. Only the *detail dialog* recomputes the deadline, which is why the two surfaces disagree.

The archive (`ArchiveProposalsList`) is already consuming `classifyProposalBucket` results, so once the classifier is deadline-aware, expired items land there automatically — no separate archive change needed.

## Changes

### 1. `src/utils/governanceGate.ts` (or a new small helper) — one shared predicate

Add a single exported helper both surfaces call so they can never disagree again:

```ts
export function isVotingClosed(
  chain: { state: number | null; currentBlock: number | null; deadlineBlock: number | null } | undefined,
  dbEndDate: string | null | undefined,
): boolean {
  // Chain-anchored: deadline block has passed
  if (chain?.currentBlock != null && chain?.deadlineBlock != null && chain.deadlineBlock > 0) {
    if (chain.currentBlock > chain.deadlineBlock) return true;
  }
  // DB motion or fallback: end_date is in the past
  if (dbEndDate) {
    const t = new Date(dbEndDate).getTime();
    if (Number.isFinite(t) && t <= Date.now()) return true;
  }
  return false;
}
```

### 2. `src/components/governance/ActiveProposalsList.tsx` — classifier

Update `classifyProposalBucket` (around line 211):

- Before the terminal switch on chain state, if `isVotingClosed(chainState, proposal.end_date)` AND the resolved state is not one of the "success/queued/executed" set (4/5/7), return `"DEFEATED"`. This covers both chain proposals stuck in state 1 past deadline AND motions with no `on_chain_id` whose `end_date` has passed.
- Add `end_date: string | null` to the `Proposal` interface (and to the `select(...)` list where `ArchiveProposalsList`, `LockedProposalsList`, and `ActiveProposalsList` load `dao_proposals`).

### 3. `src/components/governance/LifecycleTelemetry.tsx` — list mapper

In the `stateChecks` mapping (lines ~315–350):

- For chain-anchored rows: after `readChainState`, if `isVotingClosed(cs, r.end_date)` and `st` is not 4/5/7, set `lifecycle_phase: "archived"` and `status: "Voting Closed · Deadline Passed"` instead of returning `active`/`Live Vote`.
- For DB-only rows (no `on_chain_id`): if `r.end_date` is set and in the past, set `lifecycle_phase: "archived"` and `status: "Voting Closed · Deadline Passed"`. Otherwise keep existing `dbPhaseFor` logic.
- `end_date` is already returned by `select("*")`, no query change needed.

The existing `PHASE_META.archived` entry (📦 "Archived · Legacy Governor") is reused — rename its label to just **"Archived"** so it fits both legacy-Governor and deadline-passed cases, and let the per-row `status` string carry the specific reason ("Legacy Governor" vs "Voting Closed · Deadline Passed").

### 4. Verification

- Reload governance tab: `Test proposal for new contract`, `Test proposal #2`, and any other on-chain-anchored proposals with passed deadlines should now appear under **📦 Archived** in Lifecycle Telemetry and under **Archive · Defeated & Canceled** in the Active Proposals feed — never as Live Vote.
- Motion `Test Motion 1` (end_date 2026-07-08 15:03) will drop out of "In Deliberation" once its end_date passes and re-render as Archived / Voting Closed.
- Motions still within `end_date` (e.g. `Motion Test 3` until 2026-07-08 15:46) stay in their current bucket.

## Out of scope

- No DB schema changes; `end_date` already exists on `dao_proposals`.
- No edge-function change; `dao-proposal-tally` continues to run for rows that do have `end_date` server-side.
- No changes to how motions escalate to on-chain proposals.
- No changes to `LockedProposalsList` (states 6/7 are unaffected).
