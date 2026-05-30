# Fix: Voting → invalid UUID syntax

## Root cause
`ActiveProposalsList` merges two proposal sources into one list:
1. `dao_proposals` rows (`id` is a Postgres `uuid`)
2. `governanceService.getRecentProposals()` (id is the Governor's on-chain proposal id)

On-chain rows are pushed in as `{ id: p.proposalId, … }`. When a user votes on one of those cards, we insert into `dao_votes(proposal_id uuid, …)` with a non-uuid value → Postgres `22P02 invalid input syntax for type uuid`. The card's meta fetch fails for the same reason, which is why quorum/vote counts also look stuck on those rows.

## Decision
The **on-chain proposal id is the authoritative identifier** for any live (anchored) proposal — that's the value the Governor contract uses for `castVote`, `state`, `quorum`, and execution. The Supabase uuid only matters for off-chain drafts that haven't been anchored yet. We standardize on a single text column that holds the on-chain id when present, falling back to the uuid for pre-anchor drafts.

## Fix

### 1. Migration — `dao_votes` keyed by on-chain id
- Add `dao_votes.proposal_ref text` (canonical identifier: on-chain id when available, else the draft's uuid as text).
- Backfill from existing rows:
  - For votes whose `proposal_id` matches a `dao_proposals.id` with a non-null `on_chain_id` → `proposal_ref = on_chain_id`.
  - Otherwise → `proposal_ref = proposal_id::text`.
- Set `proposal_ref NOT NULL` after backfill; index it.
- Drop the old `(proposal_id, user_id)` unique constraint; add `unique (proposal_ref, user_id)` so a user still can't double-vote, regardless of source.
- Keep the legacy `proposal_id uuid` column nullable for back-compat with anything still reading it; new writes set `proposal_ref` always and leave `proposal_id` null for chain-only proposals.
- RLS unchanged (scoped by `user_id = auth.uid()`); GRANTs unchanged.

### 2. Migration — also tag `dao_proposals` cleanly
- No schema change needed; `dao_proposals.on_chain_id text` already exists. Just confirm and rely on it.

### 3. Frontend — `ActiveProposalsList.tsx`
- Extend the local `Proposal` type with `proposal_ref: string` (canonical id used for all vote reads/writes).
- Build rows:
  - DB row → `proposal_ref = row.on_chain_id ?? row.id` (on-chain id wins when anchored).
  - On-chain-only row → `proposal_ref = p.proposalId`, `on_chain_id = p.proposalId`.
- Dedupe: index DB rows by `on_chain_id`; drop any on-chain entry whose id is already covered.
- Switch the meta-fetch `.eq("proposal_id", …)` and the `handleCastVote` insert to `proposal_ref`. Drop `proposal_id` from the insert (let it stay null).
- Keep the existing on-chain bridge call exactly as-is (already keys on `proposal.on_chain_id`).

### 4. Edge functions (audit-only)
- `dao-proposal-tally` and `dao-veto-tally` switch their `dao_votes` reads to `proposal_ref` after migration. No logic change beyond the column name.

## Out of scope
- No change to `governanceService`, ACA generation, quorum logic, or the Governor bridge.
- No change to `CommitteeWorkspace` (reads `dao_proposals` only).
- No UI/visual changes.

## Verification
- Vote on a chain-only proposal → row written with `proposal_ref` = on-chain id, `proposal_id` null, bridge fires, no Postgres error.
- Vote on a Supabase draft that hasn't been anchored → row written with `proposal_ref` = uuid string, bridge skipped.
- Vote on an anchored proposal that exists in both sources → renders once; vote written with `proposal_ref` = on-chain id; bridge fires.
- Duplicate-vote attempt → blocked by `(proposal_ref, user_id)` unique with the existing `23505` toast path.
- Tally functions still return correct for/against counts after the column swap.
