# Governance System Assessment

A complete read of the committee onboarding → ascension → deliberation → voting pipeline. Each stage lists **what exists**, **what's broken**, and **what's missing**.

---

## 1. Onboarding — Apply to a Committee

**Files:** `WelcomeManualGate.tsx`, `ManualViewerModal.tsx`, `CommitteesList.tsx`, `committee_applications`, `committee_application_sponsorships`

**What exists**
- First-visit Welcome Manual gate writes `duna_welcome_ack_at` to `user_metadata`.
- 4 committees defined (Legal, Sociorelational, Security, Product/XR) — Tophat is a 5th hat shown in the wardrobe but is *not* a committee a normal user can apply to.
- Apply flow: ≥50-char Statement of Competence + MSA acknowledgment checkbox → inserts `committee_applications` row (`status='pending'`) with ACA hash.
- Tophat override path: auto-inserts the application as `approved` AND a `dao_hats` row as `active` immediately.
- User can `Revoke Request` (pending) or `Remove Membership` (resign active hat). Both anchor an ACA hash.
- Live 5-second polling refreshes registry counts.

**What's broken**
- **No reviewer path.** A pending application has no UI for anyone (Oversight Chair, Tophat) to approve/deny it. The only way into `dao_hats` today is the Tophat self-grant — every other application stalls forever in `pending`.
- **`risk_score` / `risk_flags` columns on `committee_applications` are never written or read.** Designed for AI-assisted screening but no edge function populates them.
- **Sponsorship system is dead code.** `committee_application_sponsorships` table exists with `sponsor_count` denormalized on `committee_applications`, but there is no UI for peers to endorse, and `sponsor_count` is never incremented.

**What's missing**
- Application review queue for L2/L3 ("approve / request changes / reject" with ACA-anchored decision).
- Sponsorship endorsement UI (officers cosign an application; threshold auto-promotes to `pending_veto`).
- AI competence screening edge function that populates `risk_score`/`risk_flags` from the Statement of Competence (Sybil/spam/conflict-of-interest signals).
- Email/push notification on application status change.

---

## 2. Ascension — From Application to Active Hat

**Files:** `governanceGate.ts`, `ComplianceQueue.tsx`, `ascension-promote`, `dao-hat-eligibility`, `dao_hats`

**What exists**
- Clean 4-tier ladder (L0 Prospect → L1 Officer → L2 Oversight Chair → L3 Protocol Steward), derived purely from the active hat set.
- `authorizeGovernanceAction` indemnity gate with sanitized user-facing message + full audit log line.
- `ComplianceQueue` shows hats in `pending_veto`: L2 can extend the veto window +24h, L3 can promote or veto.
- `ascension-promote` edge function: verifies caller's Tophat, requires real 64-hex SHA-256 ACA, writes audit log, attempts `aca_consent_artifacts` insert, promotes hat with graceful column degradation.
- `dao-hat-eligibility` cron sweep: hats >365d granted → `grayed`, >395d → `severed` (`revoked_at` set).
- Hat age "Authority Rot" warning dot in `HatsWardrobe`.

**What's broken**
- **`ascension-veto` edge function is called by `ComplianceQueue.tsx` (line 97) but does not exist** in `supabase/functions/`. Every veto in the Compliance Queue throws `Function not found`. This is a P0 dead-end.
- **No bridge from `committee_applications.status='approved'` → `dao_hats` insert with `eligibility_status='pending_veto'`.** Even if a reviewer marked an application approved, no automation would provision the hat or open the veto window.
- `Oversight Chair (L2)` hat is referenced by `getAscensionLevel` but **no committee in the COMMITTEES_META list creates this hat type** — L2 is effectively unreachable through normal onboarding.
- `dao-hat-eligibility` runs only when manually invoked; no scheduled cron is registered in `supabase/config.toml`.

**What's missing**
- `ascension-veto` edge function (revoke `pending_veto` hat + immutable veto reason + ACA write).
- `ascension-approve` edge function that converts an approved application into a `pending_veto` `dao_hats` row, sets `veto_window_end = now() + 72h` (or configured timelock), notifies the cohort, and enqueues a `dao_veto_tally` job.
- Cron schedule for `dao-hat-eligibility` (daily) and `dao-veto-tally` (15-min during open windows).
- Promotion path from L1 → L2: e.g., committee-elected chair, time-weighted seniority, or DAO-wide vote.
- Renewal/re-attestation flow before a hat is grayed (currently the only recovery is re-application after severance).

---

## 3. Deliberation — Committee Workspace & Motion Drafting

**Files:** `CommitteeWorkspace.tsx`, `dao_proposals`, `governance_ledger`

**What exists**
- `CommitteeWorkspace` lists the user's active hats as sidebar tabs; clicking opens that committee's ledger of motions.
- "New Motion" dialog (gated to L1+) lets officers draft title + body, generates ACA hash, inserts as `active_vote`.
- 15-second polling heartbeat for live motion list.

**What's broken**
- **Schema mismatch — P0:** `CommitteeWorkspace` reads/writes a `proposals` table (lines 60, 132). The actual table is `dao_proposals`. Every fetch returns empty and every insert fails. The Committee Workspace is non-functional today.
- **Motions are inserted with `status='active_vote'` immediately** — there is no drafting/discussion phase, no committee quorum gate, and no escalation from committee-level motion to DAO-wide proposal.
- `governance_ledger` table exists but no component reads or writes it.

**What's missing**
- Correct table binding (`dao_proposals` with a `committee_id` column — column does not currently exist on `dao_proposals` either).
- Draft / Discussion / Vote / Executed lifecycle states (the `lifecycle_phase` column on `dao_proposals` exists but is never advanced past `active`).
- Comment / amendment thread per motion (no table exists; needs `proposal_comments` with parent_id, author, ACA hash).
- Committee quorum logic — e.g., motion needs N-of-M officer signatures within committee before opening DAO-wide vote.
- Motion-level versioning (re-anchor ACA on each amendment, keep prior hashes).
- "Bring to floor" escalation button that converts a committee-passed motion into a `dao_proposals` row with on-chain proposal ID via `governanceService.propose`.
- Surfacing `governance_ledger` as an immutable audit feed (every ACA-anchored action across the system).

---

## 4. Voting — Proposals, Vetoes, Execution

**Files:** `ActiveProposalsList.tsx`, `CreateDaoProposalModal.tsx`, `PendingActionsCarousel.tsx`, `governanceService.ts`, `dao_proposals`, `dao_votes`, `dao_pending_actions`, `dao_vetoes`

**What exists**
- Two parallel proposal universes:
  1. **Off-chain DB** (`dao_proposals` + `dao_votes`) — 1 IDIA burn per vote, `vote_weight` from wallet, ACA-anchored.
  2. **On-chain Governor** (`IDIAGovernor` via `governanceService`) — full OpenZeppelin Governor: propose, castVote, quorum, snapshot, state machine.
- `CreateDaoProposalModal` writes to *both* (on-chain propose → DB insert with `tx_hash`, `on_chain_id`, `on_chain_block`).
- `ActiveProposalsList` merges DB rows + on-chain events from `getRecentProposals` and renders a unified card list.
- Withdraw-own-proposal supported when zero votes exist.
- `PendingActionsCarousel` = optimistic-update timelock queue (negative consent): vetoes require native Secure Enclave, write `dao_vetoes`, then call `dao-veto-tally` to check `veto_count >= veto_threshold` and flip status to `vetoed` / `executed`.
- Expired-but-unvetoed actions surface an `EXECUTE ON-CHAIN` button that calls `relay-governance-action` → on-chain APPROVE_AND_EXECUTE on the appropriate IDIAEscrow vault.
- `dao-timelock-sweep` and `dao-treasury-ingest` edge functions exist.

**What's broken**
- **Split-brain voting — P0:** `ActiveProposalsList` casts votes by inserting into `dao_votes` only. It never calls `governanceService.castVote`. On-chain proposals shown in the list cannot actually receive votes from the app — they require a wallet signature path that doesn't exist in the UI.
- **AI validation bypassed:** `TEMP_DISABLE_AI_VALIDATION = true` in `CreateDaoProposalModal`. The `validate-proposal` edge function exists but is never invoked.
- **Quorum & threshold never enforced off-chain:** `dao_proposals.quorum_threshold` exists but no edge function tallies `dao_votes` against it, transitions `lifecycle_phase`, or executes the proposal's effect.
- **`vote_type` / `voting_modality` columns exist but only `simple` is ever written** — no quadratic, conviction, ranked-choice, or weighted-by-tenure modalities implemented.
- **`isNative()` veto gate** blocks all web users from casting a veto. UX dead-end if user is not on iOS/Android build.
- **Voting power input is unvalidated** — `votingPower` prop comes from `useWalletBalance` and is not reconciled with on-chain `getVotes(address)` at the proposal's snapshot block; on-chain and off-chain weights can disagree silently.
- `user_proposals` / `user_votes` tables exist but no code paths use them (orphan tables, possibly old schema).

**What's missing**
- Single source of truth: either retire off-chain `dao_votes` and use Governor for all votes, or define `dao_proposals` as a *mirror* and route every UI vote through `governanceService.castVote` with the DB row purely for indexing.
- Off-chain tally + execution edge function (`dao-proposal-tally`) that reads `dao_votes`, checks quorum + simple/super majority, advances `lifecycle_phase`, and triggers effect.
- Live vote totals on each `ProposalCard` (for / against / abstain bar, quorum progress, time remaining).
- Re-enable `validate-proposal` (AI guardrail for hate speech, plagiarism, conflict-of-interest, malformed calldata before on-chain propose costs gas).
- Web fallback for vetoes (passkey-based attestation when no Secure Enclave) — or honest gating with a clear "open the mobile app" CTA instead of silent destructive toast.
- Vote-power reconciliation: at vote time, query `IDIAToken.getVotes(address, snapshotBlock)` and use that as `vote_weight`.
- Proposal categories actually used (today `category` and `impact` are collected in the form but never written to `dao_proposals`).
- Push/email notification when a proposal a user voted on resolves, when a veto window opens, when one of their motions advances.

---

## 5. Cross-Cutting Infrastructure Gaps

- **Scheduled jobs:** none of `dao-hat-eligibility`, `dao-veto-tally`, `dao-timelock-sweep` are scheduled in `supabase/config.toml`. The whole lifecycle telemetry stalls without manual triggers.
- **Notifications:** no integration of governance events with the existing `notificationStore` / `NotificationBell` (application status, vote opens/closes, veto windows, hat age warnings).
- **Audit feed:** `governance_ledger` is unused. Every ACA-anchored action should append here and be surfaced as a public, paginated, immutable log.
- **Role rotation / impeachment:** active hats can only be revoked by self-resignation, Compliance Queue veto (broken), or 365-day grayout. No peer-recall or DAO-wide impeachment vote.
- **Conflict-of-interest disclosures:** no field on applications or motions; required for fiduciary indemnity defense.
- **Privacy:** `committee_applications.statement_of_competence` is stored plaintext in the public schema. Per the project's Zero-PII rule this is borderline — likely fine since it's professional bio, but worth an explicit policy note.

---

## Priority Recommendation Stack

**Tier 1 (broken paths, fix before any new feature)**
1. Create `ascension-veto` edge function (matches existing `ascension-promote` pattern).
2. Fix `CommitteeWorkspace` table reference: `proposals` → `dao_proposals`, add `committee_id` column via migration.
3. Wire `ActiveProposalsList` votes through `governanceService.castVote` for on-chain proposals; keep `dao_votes` insert only for off-chain rows.

**Tier 2 (close the lifecycle)**
4. Build application review queue (L2/L3 approve/reject → `ascension-approve` edge fn → `dao_hats` `pending_veto` insert → 72h veto window).
5. Implement `dao-proposal-tally` for off-chain quorum & execution; advance `lifecycle_phase`.
6. Schedule the three cron jobs in `config.toml`.
7. Re-enable `validate-proposal`.

**Tier 3 (make it real governance)**
8. Sponsorship UI + threshold-based auto-promotion.
9. Motion comment/amendment thread + committee quorum gate before DAO escalation.
10. Hat renewal / re-attestation before grayout; peer-recall flow.
11. Governance audit feed surfaced from `governance_ledger`.
12. Notification integration for every state transition.

**Tier 4 (depth)**
13. Vote modalities beyond simple (quadratic, conviction).
14. Conflict-of-interest disclosures on applications and motions.
15. L1 → L2 promotion pathway (election or seniority).

---

This assessment is read-only — no files changed. Approve any tier (or specific items) and I'll build them out.
