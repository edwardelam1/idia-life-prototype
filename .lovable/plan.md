# Governance Leak Report — Pre-Mainnet Stress Test

Audit scope: `GovernanceScreen` + `governance/*` components, edge functions `dao-veto-tally`, `dao-hat-eligibility`, `dao-treasury-ingest`, and the `dao_*` / `committee_applications` / `governance_ledger` tables.

**Verdict: NOT ship-ready.** Quadratic voting is hard-broken, two tables are publicly writable due to RLS misconfiguration, the veto tally edge function is unauthenticated, vetoes can be spammed, and every realtime channel on the screen is a no-op. Details and fixes below.

---

## 🔴 SHIP BLOCKERS (must fix Friday)

### 1. Quadratic voting is dead-on-arrival
`GovernanceScreen.tsx` hard-codes `balance = 0` (line ~26, comment: *"wallets has no governance_tokens column yet"*). `ActiveProposalsList.castVote` then enforces `cost > balance` → **every vote, including weight=1 (cost=1), throws "Insufficient IDIA Tokens".** No user can cast a single vote.

Fix: add `governance_tokens` column to `wallets` (or new `governance_balances` view), seed via existing reward pipeline, and read it in `GovernanceScreen`. Until seeded, the screen must surface a "Voting opens at TGE" empty state instead of silently failing.

### 2. Votes are written to the wrong table — `dao_votes` is dead
`castVote` inserts into `governance_ledger` (a money table) with `description: "Quadratic Vote [...]"`. The actual `dao_votes` table (with `proposal_id`, `user_id`, `vote_weight`, `aca_hash_key`) is never written and has **RLS enabled with zero policies** → unreadable, unwritable, dead schema.

No proposal will ever have a tallyable vote count. Fix: route votes to `dao_votes`, add INSERT policy `auth.uid() = user_id`, add UNIQUE `(proposal_id, user_id)` to prevent re-voting, and add a SELECT policy + an aggregate view `dao_proposal_tallies`.

### 3. `dao_proposals` has RLS enabled with zero policies
Both `ActiveProposalsList` and `LifecycleTelemetry` query this table. With no SELECT policy, `authenticated` and `anon` get an empty array silently. Even when seeded, the proposals list will be blank.

Fix: `CREATE POLICY "public read proposals" ON dao_proposals FOR SELECT USING (true);` (or scoped if needed).

### 4. `user_proposals` has RLS DISABLED
`relrowsecurity = false`, but policies are defined (giving false sense of security). Anyone with the anon key — including unauthenticated visitors — can SELECT/INSERT/UPDATE every user's proposal. Plain data leak.

Fix: `ALTER TABLE user_proposals ENABLE ROW LEVEL SECURITY;`.

### 5. Veto spam — no uniqueness constraint on `dao_vetoes`
`dao_vetoes` only enforces `auth.uid() = user_id` on INSERT. **One sovereign can submit N vetoes for the same action and trip `veto_threshold` solo.** The edge function counts raw rows.

Fix: `ALTER TABLE dao_vetoes ADD CONSTRAINT dao_vetoes_unique_per_user UNIQUE (action_id, user_id);` and surface the constraint error as "already vetoed" in the UI.

### 6. `dao-veto-tally` edge function is unauthenticated
The function reads `actionId` from the request and writes `status='executed'` / `status='vetoed'` to `dao_pending_actions` using the service role. It does **not** check JWT, an admin role, nor an HMAC. Any unauthenticated caller can flip pending governance actions to `executed` once their timelock has expired, or to `vetoed` after spamming `dao_vetoes` (see #5).

Fix: require a valid Supabase JWT (set `verify_jwt=true` in `supabase/config.toml` and read `req.headers.authorization`), or add HMAC signature signed by an internal secret. Do not allow anonymous mutations into governance state on mainnet.

### 7. `dao-hat-eligibility` is unauthenticated
Same shape — anyone can trigger the sweep that grays/severs hats. Add JWT verification + role check (`security_council` hat or service-role caller only).

### 8. Every realtime subscription in the gov tab is a no-op
`PendingActionsCarousel`, `MSAComplianceCard`, `TreasuryFlows`, `LifecycleTelemetry` all subscribe to `postgres_changes` on tables that are **not in the `supabase_realtime` publication** (verified: `pg_publication_tables` returns 0 rows for `dao_*`). Vetoes, treasury flows, MSA breaches will never push to clients live.

Fix: `ALTER PUBLICATION supabase_realtime ADD TABLE dao_pending_actions, dao_proposals, dao_msa_metrics, dao_treasury_flows;` and `ALTER TABLE ... REPLICA IDENTITY FULL;` for each.

---

## 🟠 HIGH (fix before mainnet)

### 9. `generateACAHash` web fallback is a stub
On web/preview (`!Capacitor.isNativePlatform()`) the function returns `DEV_TOUCHPOINT_SIMULATION_<uuid>` and persists it as the `hardware_attestation_id`. Any user voting/vetoing/applying from the published web build (current Lovable preview, `idia-life.lovable.app`, `life.thebigidia.com`) writes a **forgeable** ACA. The DELT Protocol promise is broken on web. Either (a) gate all governance actions behind `Capacitor.isNativePlatform()`, or (b) replace the dev branch with a real WebAuthn (passkey) signature so the web path is also hardware-anchored.

### 10. `committee_applications` lacks workflow + uniqueness
- `status` is nullable text with no CHECK / enum.
- No UNIQUE `(user_id, committee_id, status='pending')` → user can apply 100 times by clicking through.
- No admin-side review surface or RPC; `userApplications` only blocks the button after a refresh.

Fix: enum `application_status`, partial unique index, and an admin RPC for accept/deny that also issues the corresponding `dao_hats` row.

### 11. `dao_hats` has no INSERT path
Only a SELECT-own policy exists. There is no mechanism (RPC, edge function, admin policy) to actually grant a hat. Hats Wardrobe will be empty on mainnet day one and the Tophat / Security flows have no genesis.

Fix: a `grant_hat(user_id, hat_type)` SECURITY DEFINER RPC restricted to the existing Tophat holder, plus a seeded genesis Tophat.

### 12. Telemetry tables empty + no ingest UI
`dao_msa_metrics`, `dao_treasury_flows`, `dao_pending_actions`, `dao_proposals` all have **0 rows**. The `dao-treasury-ingest` function exists but no scheduler/cron is wired. Mainnet day one users will see "Awaiting Oracle" everywhere. Either schedule the ingest (pg_cron + secret) or seed Genesis state.

---

## 🟡 MEDIUM (cleanup)

- `PendingActions.category` rendered without null-guard → shows blank chip when null.
- `dao-veto-tally` only marks `executed` when the client triggers it after a veto. Nothing executes timelocks that simply expire (no cron). Add a scheduled sweep.
- No quorum / `end_date` enforcement on `dao_proposals` lifecycle transitions.
- `LifecycleTelemetry` falls back to `draft` for unknown phases — silently masks bad state.

---

## Proposed Remediation Order (single migration + small code patch)

```text
migration:
  1. ALTER TABLE user_proposals ENABLE ROW LEVEL SECURITY
  2. CREATE POLICY public-read on dao_proposals (SELECT true)
  3. CREATE POLICY insert-own on dao_votes (auth.uid()=user_id)
     + UNIQUE(proposal_id,user_id) + SELECT-all policy
  4. UNIQUE(action_id,user_id) on dao_vetoes
  5. CHECK + partial unique on committee_applications.status
  6. ALTER PUBLICATION supabase_realtime ADD TABLE (4 dao_* tables)
     + REPLICA IDENTITY FULL
  7. grant_hat(uuid, hat_type) SECURITY DEFINER + Tophat genesis seed
  8. ALTER wallets ADD COLUMN governance_tokens numeric DEFAULT 0

edge functions:
  9.  dao-veto-tally:  verify_jwt=true, require service-role or hat
  10. dao-hat-eligibility: verify_jwt=true, role-gated

frontend (governance/*):
  11. GovernanceScreen — read wallets.governance_tokens, not 0
  12. ActiveProposalsList — write to dao_votes (not governance_ledger)
  13. PendingActionsCarousel — null-guard category, surface duplicate-veto error
```

No DB schema is renamed or dropped. No PII enters public schema (DELT honored). All edge function changes use `SUPABASE_SERVICE_ROLE_KEY` server-side only.

---

## Out of scope for this audit
Trust scores, wallet send/receive, BioTether, CPM/Pure Alpha dashboards, ToS overlay. Those will need their own pre-ship sweeps if you want them done before Friday — say the word and I'll do social/wallet next.
