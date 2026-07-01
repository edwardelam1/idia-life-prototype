## Root cause

Two cancelled proposals live in `dao_proposals` (`40a4b495…` and `331d836d…`, both `lifecycle_phase='cancelled'`) with on-chain ids that belong to the previous Governor. `readChainState` returns `state = null` for those ids (the current Governor can't resolve them).

In `src/components/governance/ActiveProposalsList.tsx` → `classifyProposalBucket` (lines 211–222):

```ts
if (chainState?.state != null) return classifyBucket(chainState.state, hasOnChainId);
if (hasOnChainId) return "UNRESOLVED";     // ← cancelled legacy rows land here
const dbState = deriveDbState(proposal);
if (dbState != null) return classifyBucket(dbState, false);
```

Because `state` is `null` and `on_chain_id` is present, both cancelled rows are bucketed as `UNRESOLVED` and never reach `DEFEATED`. `ArchiveProposalsList` filters for `DEFEATED` only, gets 0 rows, and returns `null` — the whole "Archive · Defeated & Canceled" section disappears.

## Fix (frontend-only)

Consult the DB-derived state *before* giving up as `UNRESOLVED`, so a legacy-governor row still resolves via its stored `lifecycle_phase`/`status`.

**`src/components/governance/ActiveProposalsList.tsx`** — reorder the fallbacks in `classifyProposalBucket`:

```ts
if (chainState?.state != null) return classifyBucket(chainState.state, hasOnChainId);
const dbState = deriveDbState(proposal);
if (dbState != null) return classifyBucket(dbState, hasOnChainId);
if (hasOnChainId) return "UNRESOLVED";
return "ACTIVE_FEED";
```

That routes `lifecycle_phase='cancelled'` → dbState 2 → `DEFEATED` bucket, so both rows appear in the Archive section and the collapsible re-renders. Live proposals on the current Governor are unaffected — they still hit the first branch on `chainState.state != null`. If a live-Governor RPC read transiently fails, the DB fallback now keeps the card visible in its correct bucket instead of hiding it as `UNRESOLVED`, which is a strictly better failure mode.

No DB, migration, or lifecycle-telemetry changes needed.
