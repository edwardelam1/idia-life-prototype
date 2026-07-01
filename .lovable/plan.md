## Root cause

After the last fix, cancelled legacy-Governor rows landed in the Archive correctly, but the 3 legacy rows whose DB `lifecycle_phase` is still `'active'` now flow through the reordered fallback in `classifyProposalBucket`:

- `chainState.state` is `null` (current Governor can't resolve the id).
- `deriveDbState(...)` returns `1` (Active).
- They get bucketed as `ACTIVE_FEED` and rendered as ProposalCards with the `Syncing` status label — permanently, because the Governor they belong to is gone.

## Fix (frontend-only)

If we did successfully call the Governor and it returned `state = null` for a proposal that has an `on_chain_id`, that proposal is orphaned on a previous Governor — send it straight to the Archive bucket instead of trusting the DB "active" phase.

**`src/components/governance/ActiveProposalsList.tsx`** — update `classifyProposalBucket` to short-circuit legacy-Governor rows to `DEFEATED` before falling back to the DB state:

```ts
const hasOnChainId = !!proposal.on_chain_id?.trim();
if (chainState?.state != null) return classifyBucket(chainState.state, hasOnChainId);
// Chain read completed but the current Governor doesn't recognize this id
// (i.e. legacy Governor). Archive it — don't trust the DB "active" phase.
if (chainState && hasOnChainId) return "DEFEATED";
const dbState = deriveDbState(proposal);
if (dbState != null) return classifyBucket(dbState, hasOnChainId);
if (hasOnChainId) return "UNRESOLVED";
return "ACTIVE_FEED";
```

Effect:
- 3 legacy `active` rows → `DEFEATED` → appear inside the existing Archive collapsible alongside the cancelled ones. Their "Syncing" ProposalCards disappear from the Active feed.
- The genuine live proposal on the current Governor still hits the first branch (`chainState.state === 1`) and stays in Active.
- Transient RPC failures (no `chainState` in the map at all) still fall through to the DB-derived state, so temporarily-failed live cards aren't hidden.

No DB, migration, telemetry, or Archive-UI changes needed.
