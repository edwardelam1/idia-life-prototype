## Goal
Eliminate state-bleed on the Governance dashboard by routing every proposal into exactly one bucket keyed on the canonical OpenZeppelin Governor state, and visually separate the terminal "Locked" set from the active feed via a collapsed accordion placed below Lifecycle Telemetry.

## Bucket contract (single source of truth)
A proposal's bucket is decided exclusively by `gov.state(proposalId)` (or `null` while hydrating):

| Bucket            | OZ states          | Surface                                       |
|-------------------|--------------------|-----------------------------------------------|
| `ACTIVE_FEED`     | 0 Pending, 1 Active| `ActiveProposalsList` (main vote feed)        |
| `TELEMETRY`       | 4 Succeeded, 5 Queued | `LifecycleTelemetry`                       |
| `DEFEATED`        | 2 Canceled, 3 Defeated | excluded from all visible feeds (not rendered) |
| `LOCKED`          | 6 Expired, 7 Executed | new `LockedProposalsList` (collapsed)      |
| `UNRESOLVED`      | `state === null`   | rendered in Active feed only if no on-chain id (pure DB draft); otherwise hidden until hydrated |

A proposal can never appear in two buckets — the classifier is a switch on the integer; the consumers do not re-filter or fall through.

## Changes

### 1. `src/components/governance/ActiveProposalsList.tsx`
- Add a parent-level chain-state hydration pass: for each fetched proposal with an `on_chain_id`, call the existing `readChainState` once and store `{ proposalRef → state }` in a `Map` in component state.
- Add `classifyBucket(state, hasOnChainId)` helper that returns `'ACTIVE_FEED' | 'TELEMETRY' | 'DEFEATED' | 'LOCKED' | 'UNRESOLVED'` via a strict `switch`. No range checks, no `>=`, no `Set` membership reuse — just integer equality.
- Filter the rendered `proposals.map(...)` to `bucket === 'ACTIVE_FEED'` (plus `UNRESOLVED` pure-DB drafts with no `on_chain_id`).
- Pass `initialChainState` into `ProposalCard` so the card never momentarily renders the orange "Active" fallback badge while hydrating.
- In `ProposalCard`:
  - When `chain.state` is `null`, render a neutral slate "Syncing" badge instead of the orange default.
  - When `isFinal`, suppress the animated `QuorumBar` pulse (already partly handled) and force the badge to the chain-derived `STATE_NAME[state]` (Executed / Expired / Defeated / Canceled / Succeeded / Queued) with the corresponding color tone. Never render "Active" or vote CTAs for terminal states (already gated by `!isFinal`, keep).
- Export `ProposalCard` and the parent-side `readChainState` + `classifyBucket` so the new Locked list can reuse them without duplication.

### 2. New `src/components/governance/LockedProposalsList.tsx`
- Mirrors the fetch logic in `ActiveProposalsList` (Supabase + on-chain dedupe).
- Hydrates on-chain `state` per proposal, keeps only `state === 6 || state === 7`.
- Renders inside `Collapsible` (shadcn) defaulting `open={false}`:
  - Trigger: full-width pill button labelled **"Locked Proposals"** with a count badge and a chevron that rotates on open.
  - Content: stacked `ProposalCard`s (reuses the same component; cards naturally show terminal badge + no vote UI).
- Empty bucket → render nothing (no clutter).

### 3. `src/components/governance/LifecycleTelemetry.tsx`
- After the Supabase fetch, hydrate on-chain `state` per item with `readChainState` and keep only items where `state === 4 || state === 5`. Items lacking an `on_chain_id` fall through unfiltered only if `lifecycle_phase === 'queued'` (matches the Succeeded/Queued contract for off-chain placeholders).
- No visual changes; the section keeps its current layout.

### 4. `src/components/GovernanceScreen.tsx`
- Add a new section directly **below** the existing Lifecycle Telemetry section:
  ```
  <section className="space-y-3">
    <h2>…Locked Proposals header…</h2>
    <LockedProposalsList refreshTrigger={refreshKey} />
  </section>
  ```
- Header styling matches the other section labels (uppercase tracking, muted color, small icon).
- No other ordering changes.

## Out of scope
- No edge-function changes.
- No backend / DB schema changes.
- Defeated bucket is intentionally not surfaced anywhere (per the strict mutual-exclusion contract — it simply disappears from view).

## Verification
- Manually inspect the rendered feed: every proposal appears in exactly one of {Active feed, Telemetry, Locked accordion}; none appear in two.
- A proposal in state 7 (Executed) shows an "Executed" emerald badge, no progress pulse, no vote buttons, and only inside the collapsed Locked accordion.
- `console.log` traces from `readChainState` confirm each proposal resolves to a single integer state before classification.
