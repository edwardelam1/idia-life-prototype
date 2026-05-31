## Goal

Permanently eliminate `GovernorUnexpectedProposalState` hash collisions, stop "ghost" rows from crashing the Active feed, and harden chain reads against `ERC5805FutureLookup` reverts on Pending proposals.

---

## 1. GUID-salted description (prevents hash collisions)

**Problem:** Today `CreateDaoProposalModal` calls `governanceService.propose()` *before* inserting the DB row, so no UUID exists yet to salt with. We must pre-mint the UUID on the client and reuse it for both the on-chain description and the DB primary key.

**Frontend — `src/components/governance/CreateDaoProposalModal.tsx`:**
- Before calling `governanceService.propose()`, generate `const proposalUuid = crypto.randomUUID()`.
- Build the description string as:
  ```
  # ${safeTitle}\n\n${safeDescription}\n\n---\n*System Ref: ${proposalUuid}*
  ```
- Pass that exact string into `governanceService.propose(fullDescription)`.
- On the subsequent `dao_proposals` insert, set `id: proposalUuid` so the on-chain `System Ref` matches the DB primary key 1:1.

**Backend — `supabase/functions/relay-governance-action/index.ts` (CANCEL_PROPOSAL branch):**
- The `dao_proposals` lookup already returns `id`. When rebuilding `descriptionHash`, use:
  ```
  ethers.keccak256(ethers.toUtf8Bytes(`# ${title}\n\n${description}\n\n---\n*System Ref: ${row.id}*`))
  ```
- This keeps the salt deterministic — same UUID that the frontend baked in at submit time.

No new DB columns. No migration. The salt rides inside the description text and the existing `id`/`on_chain_id` linkage stays untouched.

---

## 2. Drift sweep guard in `classifyBucket`

**File:** `src/components/governance/ActiveProposalsList.tsx`

Inject a top-of-function guard into `classifyProposalBucket` (the proposal-aware wrapper — `classifyBucket` itself is state-only and can't see `lifecycle_phase`):

```ts
export function classifyProposalBucket(proposal: Proposal, chainState?: ChainState): ProposalBucket {
  const phase = (proposal.lifecycle_phase || "").toLowerCase();
  if (phase === "archived" || phase === "drift") return "DEFEATED";
  // ...existing logic
}
```

Effect: admin sets `lifecycle_phase = 'drift'` on a stuck row → next render sweeps it out of `ACTIVE_FEED` into the Defeated bucket, and the `ProposalCard` poller for that row stops being mounted under Active.

---

## 3. Time-travel guard on chain reads

**File:** `src/components/governance/ActiveProposalsList.tsx`, inside `readChainState`.

Currently `proposalVotes(id)` and `quorum(snapshotBlock)` are always called. For state 0 (Pending) the snapshot is in the future → `ERC5805FutureLookup` revert (exactly what the console log shows: `0xecd3f81e` on `quorum(46768431)` while current block is ~46768425).

Restructure the fetch:
1. First read `state(onChainId)` and `currentBlock` (always safe).
2. If `state > 0` (Active or later) → read `proposalVotes`, `proposalSnapshot`, `proposalDeadline`, and `quorum(snapshotBlock)` as today.
3. If `state === 0` → skip `proposalVotes` and `proposalSnapshot`-derived quorum entirely. Default `forVotes/againstVotes/abstainVotes = 0`, set `snapshotBlock` to the raw value (for the existing Pending countdown UI) but fetch quorum via `gov.quorum(currentBlock - 1)` instead, so the card still shows the live quorum threshold without touching a future block.

Wrap each chain call in its own try/catch so one revert can't poison the rest of the hydration.

---

## Out of scope

- No DB migration, no new columns.
- No changes to vote casting, archive list, locked list, telemetry list, or the create-proposal UI.
- No changes to `governanceService.propose` signature — it already accepts an arbitrary description string.
- No changes to existing proposals already on-chain (their hashes are immutable; the guard in §2 is the escape hatch for any that drifted before this fix shipped).

---

## Verification

- Submit two proposals with identical title + description back-to-back → both anchor successfully (different `on_chain_id`s, different `System Ref` UUIDs visible in the description preview).
- Console no longer prints `[PROPOSAL_CARD] direct chain fetch failed … ERC5805FutureLookup` for fresh Pending proposals; `[QUORUM_DEBUG]` still logs with `quorum=<live>` and `for=0 against=0 state=0`.
- Manually set a row's `lifecycle_phase = 'drift'` via SQL editor → on next 15s poll the card disappears from Active and stops generating chain calls.
- Cancel flow still works: relayer rebuilds the salted descriptionHash from `row.id` and OZ Governor accepts `cancel()`.
