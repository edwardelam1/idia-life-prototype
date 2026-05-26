# Fix Quorum Tally in LifecycleTelemetry

## Problem
`DetailDialog` in `src/components/governance/LifecycleTelemetry.tsx` currently:
1. Measures quorum against `forVotes` only — but `GovernorCountingSimple` counts **For + Against + Abstain** toward quorum.
2. Uses row count (`.length`) instead of summing token weight — but `dao_votes` has a `vote_weight numeric` column (confirmed via schema query) that mirrors on-chain delegated weight.
3. Has limited telemetry, allowing silent stalls in the tally fetch.

## Changes (single file: `src/components/governance/LifecycleTelemetry.tsx`)

### 1. Query weight, not just type
Change the Supabase select to `"vote_type, vote_weight"`.

### 2. Aggregate weight per side
```ts
const sumWeight = (rows, type) =>
  rows.filter(r => r.vote_type === type)
      .reduce((acc, r) => acc + Number(r.vote_weight ?? 1), 0);

const talliedFor = sumWeight(rows, "for");
const talliedAgainst = sumWeight(rows, "against");
```
Falls back to weight `1` if the column is null, preserving legacy rows.

### 3. Fix quorum math
```ts
const totalVotes = forVotes + againstVotes;
const pct = useMemo(
  () => Math.min(100, (totalVotes / Math.max(1, quorum)) * 100),
  [totalVotes, quorum],
);
```

### 4. Update progress display
Header chip: `{totalVotes} / {quorum} ({pct.toFixed(1)}%)` — keeps the per-side For/Against breakdown underneath unchanged.

### 5. Granular stage logging
Wrap the tally effect with `stage("LIFECYCLE_DETAIL","TALLY")` start/intermediate/end markers:
- `[START]` on effect entry with `proposal.id`
- `[ERROR]` on Supabase failure with the error payload
- `[ABORT]` when the component unmounts mid-fetch
- `[SUCCESS]` with `{ for, against, totalParticipation }`
- `[END]` in the `finally` block confirming clean finalization

## Out of scope
- No DB migration — `vote_weight` already exists.
- No changes to `ProposalCard` vote-casting flow (it already writes `vote_weight: 1`).
- No abstain support yet (not in current schema / UI) — easy to add later by extending the same aggregator.
