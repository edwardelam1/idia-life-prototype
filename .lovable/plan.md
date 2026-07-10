# Execution Phase Section

Add a new collapsible section that surfaces proposals currently in the execution phase (post-pass, in timelock / queued / awaiting execute), styled in gold. It behaves exactly like the existing `SuccessfulProposalsList` and `ArchiveProposalsList` — those stay untouched and are only used as structural references.

## Placement

In `src/components/GovernanceScreen.tsx`, inside `WyomingPortal`, insert the new section between Lifecycle Telemetry and Successful Quorum Reached:

```text
Lifecycle Telemetry
Archive · Execution Phase          ← NEW (gold)
Archive · Successful Quorum Reached
Archive · Defeated & Canceled
Locked
```

## New component: `src/components/governance/ExecutionPhaseList.tsx`

Cloned structure from `SuccessfulProposalsList.tsx`, with these differences:

- **Bucket filter**: only proposals whose live governor state is `Queued (5)` OR DB `lifecycle_phase`/`status` normalized to one of: `queued`, `timelock`, `in_timelock`, `awaiting_execution`, `pending_execution`. Exclude `Executed (7)` and `Succeeded (4)` — those belong to Successful Quorum Reached.
- **Styling**: gold palette — `bg-amber-50/60 dark:bg-amber-950/20`, `border-amber-300/70 dark:border-amber-900/40`, icon `Gavel` or `Timer` in `text-amber-600`, count pill `bg-amber-100 text-amber-800`. Header label: `Archive · Execution Phase`.
- **Glow on new entry**:
  - Persist last-seen execution-phase IDs in `localStorage` key `execution_phase_seen_ids_v1` (JSON array of `proposal_ref`).
  - On fetch, diff against stored set. If any new IDs are present, add a `ring-2 ring-amber-400 animate-pulse shadow-[0_0_24px_rgba(245,158,11,0.55)]` class to the collapsible trigger for 8 seconds, then persist the updated set.
  - Glow is suppressed on first-ever load (empty stored set is initialized silently to the current IDs so the section doesn't glow for pre-existing items).
- **Notification on new entry**:
  - For each newly detected proposal, call `notify.success("Proposal entered execution phase", { description: <title> })` from `@/lib/notify` — this both shows the sonner pill and records it in the Notification Center bell dropdown (per `use-toast.ts` shim behavior).
  - Fire once per proposal (guarded by the localStorage set).
- **Terminal for interactions**: like Successful/Archive, `onChanged` is a no-op; ProposalCard renders read-only historical state (users cannot vote from here — execution is handled via Negative Consent / timelock sweep).
- Returns `null` when empty (no header shown) — matches sibling behavior.

## Governance Screen wiring

Add import and a new `<section>` in `WyomingPortal` above the existing Successful section:

```tsx
import ExecutionPhaseList from "./governance/ExecutionPhaseList";

<section className="space-y-3">
  <ExecutionPhaseList
    balance={idiaBalance}
    votingPower={votingPower}
    refreshTrigger={refreshKey}
  />
</section>
```

## Non-goals

- No changes to `ArchiveProposalsList.tsx` or `SuccessfulProposalsList.tsx`.
- No changes to indexer / edge functions — the section reads from the same `dao_proposals` + on-chain state already reconciled by `governance-indexer`.
- No new DB tables. Seen-state is device-local (localStorage) — matches the "just alert the user" scope.

## Technical notes

- Reuses `ProposalCard`, `readChainState`, `sortByGovernanceOrder`, `type Proposal`, `type ChainState` re-exported from `ActiveProposalsList.tsx`.
- Reuses `getAscensionLevel` for hat context passed into `ProposalCard`.
- Governor state constants: `4=Succeeded`, `5=Queued`, `7=Executed`. Execution Phase = `{5}` on-chain + phase-name fallbacks listed above for DB-only rows that reached timelock before an on-chain read landed.
