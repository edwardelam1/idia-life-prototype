## Problem

`LifecycleTelemetry` queries the latest 10 `dao_proposals` across all users (no proposer filter, RLS off), but rows are dropped from the rendered feed whenever the per-row on-chain `readChainState` call throws. Other users' recent proposals (notably Shawn's `Test android proposal 28 june`) hit that path and disappear, so the feed looks single-user.

Verified against the DB — both your proposals and Shawn's are present in the top 10:

| Proposer | Title | on_chain_id | DB lifecycle_phase |
|---|---|---|---|
| Shawn (9ac1…) | Test android proposal 28 june | 91202…8934 | active |
| Shawn (9ac1…) | Android test motion | null | draft |
| You (217c…) | Testing new quorum | 23841…3255 | cancelled |
| You (217c…) | Testing 3 | 10669…4945 | cancelled |
| … | … | … | … |

So the data is reachable; the presentation layer is filtering it out.

## Fix (frontend-only, single file)

`src/components/governance/LifecycleTelemetry.tsx` — `fetchItems` per-row mapping:

1. **Never return `null`.** Replace the `catch` branch with a fallback that keeps the row, using the DB-stored `lifecycle_phase` / `status` (or a sane default of `draft` / "Pending Chain Sync") when the chain read fails.
2. **Honor the DB `lifecycle_phase` for terminal states the chain mapper currently flattens.** Today states 2/3/6 (canceled/defeated/expired) all collapse to `{ phase: "draft", status: "Archived" }`. Map them to the existing `executed`/`draft` buckets but preserve the DB `status` string so the card label reflects reality (e.g. "Cancelled").
3. **Widen the phase sort order** so it includes `cancelled` rows at the tail rather than implicitly sorting them as `draft`. Use the existing `order` map, defaulting unknown phases to a high index so they sort last but still render.
4. **Remove the `.filter((x): x is ProposalLite => x !== null)`** since no row should ever be null after step 1; replace with a type assertion / no-op filter.

No backend, RLS, GRANT, edge-function, or schema changes — `dao_proposals` is already readable by all authenticated users and the table has rows from every proposer.

## Out of scope

- `ActiveProposalsList`, `ArchiveProposalsList`, `LockedProposalsList` — user only flagged Lifecycle Telemetry.
- Increasing the `.limit(10)` cap (can revisit if 10 isn't enough once cross-user rows render).
- Any change to `readChainState` itself.

## Files touched

- `src/components/governance/LifecycleTelemetry.tsx` (resilient per-row mapping)
