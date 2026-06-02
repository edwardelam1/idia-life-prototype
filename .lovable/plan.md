## Refined plan — incorporates Principal Architect corrections

### Schema migration (`dao_votes`)

The current table carries a legacy `proposal_id uuid` (pointed at `dao_proposals.id`) **and** a `proposal_ref text` (the canonical on-chain id, e.g. `governance_proposals.proposal_id`). To enforce strict naming uniformity with `governance_proposals_pkey (proposal_id text)`:

```sql
-- 1. Drop the legacy uuid column (no FK exists; safe).
ALTER TABLE public.dao_votes DROP COLUMN IF EXISTS proposal_id;

-- 2. Rename canonical text column → proposal_id to match governance_proposals_pkey.
ALTER TABLE public.dao_votes RENAME COLUMN proposal_ref TO proposal_id;

-- 3. Add snapshot-weight columns.
ALTER TABLE public.dao_votes ADD COLUMN IF NOT EXISTS snapshot_block bigint NULL;
ALTER TABLE public.dao_votes ADD COLUMN IF NOT EXISTS snapshot_voting_power numeric NULL;

-- 4. Index for ledger lookups.
CREATE INDEX IF NOT EXISTS idx_dao_votes_proposal_id ON public.dao_votes (proposal_id);
```

No GRANT changes required (existing grants follow the table, not the column). RLS policies that referenced `proposal_ref` will be rewritten to use `proposal_id` in the same migration.

After the rename, every `from("dao_votes").select(...).eq("proposal_ref", ...)` and `.insert({ proposal_ref: ... })` site in the frontend is updated to `proposal_id`. Affected files: `ActiveProposalsList.tsx`, `ArchiveProposalsList.tsx`, `LockedProposalsList.tsx`, `LifecycleTelemetry.tsx`, `CommitteeWorkspace.tsx` — anywhere `dao_votes` is read or written. The in-memory `Proposal.proposal_ref` field name stays the same to minimize churn; only the DB column changes.

### Cast-vote pipeline (`handleCastVote` in `ActiveProposalsList.tsx`)

Bookended telemetry on every phase, snapshot weight from `governor.getVotes`, then **optimistic bump first, RPC refresh deferred 1500 ms**:

```ts
console.log(`[GOV_VOTE][START] proposal_id=${proposal.on_chain_id} voter=${voterAddress}`);

// signature + relay phase (existing logic, unchanged) ...

console.log(`[GOV_VOTE][RPC_QUERY][START] getVotes @snapshot=${chain.snapshotBlock}`);
const snapshotWeightRaw = await gov.getVotes(voterAddress, chain.snapshotBlock);
const snapshotWeight = Number(ethers.formatUnits(snapshotWeightRaw, 18));
console.log(`[GOV_VOTE][RPC_QUERY][END:OK] weight=${snapshotWeightRaw.toString()}`);

console.log(`[GOV_VOTE][DB_INSERT][START] dao_votes proposal_id=${proposal.proposal_ref}`);
const { error: insertErr } = await supabase.from("dao_votes").insert({
  proposal_id: proposal.proposal_ref,
  user_id: user.id,
  vote_type: support,
  vote_weight: Number(chosenWeight),               // legacy compat
  snapshot_voting_power: snapshotWeight,
  snapshot_block: chain.snapshotBlock,
  credits_spent: tophatOverride ? 0 : 1,
  aca_hash_key: hash,
  aca_payload: payload,
});
if (insertErr && insertErr.code !== "23505") throw insertErr;
console.log(`[GOV_VOTE][DB_INSERT][END:OK]`);

// 1. INSTANT optimistic UI — no RPC, no await.
console.log(`[GOV_VOTE][OPTIMISTIC][APPLY] +${snapshotWeight} on ${support}`);
setChain((prev) => ({
  ...prev,
  forVotes:     support === "for"     ? prev.forVotes     + snapshotWeight : prev.forVotes,
  againstVotes: support === "against" ? prev.againstVotes + snapshotWeight : prev.againstVotes,
}));

// 2. Authoritative refresh — deferred 1500 ms so Base Mainnet propagates.
console.log(`[GOV_VOTE][CHAIN_REFRESH][SCHEDULED] +1500ms`);
setTimeout(async () => {
  console.log(`[GOV_VOTE][CHAIN_REFRESH][START]`);
  try {
    const cs = await readChainState(proposal.on_chain_id);
    setChain(cs);
    console.log(`[GOV_VOTE][CHAIN_REFRESH][END:OK] for=${cs.forVotes} against=${cs.againstVotes}`);
  } catch (e) {
    console.warn(`[GOV_VOTE][CHAIN_REFRESH][END:WARN]`, e);
  }
}, 1500);
```

Tophat override path skips `getVotes` and stores `snapshot_voting_power = null`, falling back to the relay-returned Treasury weight in `vote_weight`.

All catches funnel through `console.error('[GOV_VOTE][FATAL_FAIL]', err)`.

### Voter Ledger UI (new sub-component under `QuorumBar`)

Collapsible block in `ProposalCard`. Query:

```ts
supabase
  .from("dao_votes")
  .select("user_id, vote_type, vote_weight, snapshot_voting_power, snapshot_block, created_at")
  .eq("proposal_id", proposal.proposal_ref)
  .order("snapshot_voting_power", { ascending: false, nullsFirst: false });
```

Wallets resolved via `member_wallet_directory` (already RLS-safe), keyed on `user_id`. Row format:

```
✔ 0x12…ab  · FOR     · 18,450 IDIA  @snap #28,114,902
✗ 0x77…ee  · AGAINST · 312 IDIA     @snap #28,114,902
```

Display prefers `snapshot_voting_power`; legacy rows (NULL) fall back to `vote_weight` with a faint "legacy" tag. Aggregate For/Against above the ledger still reads from the chain — ledger is the per-voter breakdown.

### Files touched

- `supabase/migrations/<new>.sql` — drop legacy `proposal_id uuid`, rename `proposal_ref` → `proposal_id`, add `snapshot_block` + `snapshot_voting_power`, recreate dependent RLS policies, add index.
- `src/components/governance/ActiveProposalsList.tsx` — telemetry-wrapped `handleCastVote`, optimistic bump, deferred 1500 ms `readChainState`, new `VoterLedger` sub-component, column-name swap in DB queries.
- `src/components/governance/ArchiveProposalsList.tsx`, `LockedProposalsList.tsx`, `LifecycleTelemetry.tsx`, `CommitteeWorkspace.tsx` — swap `proposal_ref` → `proposal_id` in `dao_votes` queries only.
- `src/integrations/supabase/types.ts` — regenerated automatically post-migration.

### Out of scope

- No edge-function changes; relay still carries only signature + intent.
- No change to aggregate For/Against rendering — still chain-sourced.
- No change to Tophat override semantics beyond null-snapshot-power tagging.