# Fix Execution Tracker status display and the Execution Phase archive count

## What's wrong today

Verified against the database — there is exactly one execution task:

- Title: "Test proposal for new contract", `status = executed`, `execution_deadline_at = 2026-07-21`, no tx hash recorded.
- Its proposal row still carries `status / lifecycle_phase = awaiting_execution`, while the on-chain state reads Executed.

Two resulting bugs:

1. **"Overdue by 24d 4h" on an executed task.** The Delaware MSA tracker renders the deadline countdown for every task regardless of status, so a task that was completed weeks after its deadline still shows an overdue clock next to the green "Executed" badge.
2. **"Archive · Execution Phase" shows 0 under Wyoming DUNA.** That section only counts proposals whose live Governor state is Queued (5). Once the proposal was executed, the chain state flipped to 7, so it dropped out of the section entirely and shows nothing — even though the execution tracker has a completed entry for it.

## The fix

### 1. Execution Tracker (Delaware MSA)

- When a task is terminal (`executed` or `failed`), stop rendering the countdown. Show a completion line instead:
  - executed: "Executed" plus the completion timestamp (from the task's last-updated time, or the `executed` event in `dao_execution_events` when present).
  - failed: "Closed" plus the timestamp, alongside the existing failure reason.
- Keep the countdown / overdue clock only for live statuses (`ready`, `executing`, `extension_pending`).
- Keep the existing client-side overdue promotion, but only apply it to live statuses (it already does) so an executed task can never be re-labelled overdue.

### 2. Archive · Execution Phase (Wyoming DUNA)

- Make the section reflect the execution tracker, not just the transient Queued chain state. It will list a proposal when either:
  - its live Governor state is Queued (5) or its DB phase is one of the awaiting-execution markers (current behaviour), **or**
  - a `dao_execution_tasks` row exists for that proposal (any status) — this is the archive of everything that entered execution.
- Show the tracker status on each entry so the completed one reads "Executed" rather than looking still-pending, and match on both `proposal_id` and `onchain_proposal_id` so chain-only rows resolve too.
- With this change the section header count becomes 1 for the current data, with the entry marked Executed.

## Technical notes

- Files touched: `src/components/governance/ExecutionTracker.tsx` (terminal-state rendering) and `src/components/governance/ExecutionPhaseList.tsx` (extra query against `dao_execution_tasks`, merged inclusion rule, status chip).
- No schema changes, no migrations, no edge function changes. Read-only additional query using existing RLS (all authenticated users can read `dao_execution_tasks`).
- The stale `awaiting_execution` phase left on the proposal row is not rewritten; the UI derives truth from the execution task and live chain state instead.
