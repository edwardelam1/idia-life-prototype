## Ascension Path — Onboarding Hook + Fiduciary Cooling-Off

A 3-stage Security-Gated Lifecycle for committee officers, layered onto the existing `committee_applications` + `dao_hats` flow without breaking the current Tophat override or the live-hydrated `CommitteesList`.

### Stage model

```text
Prospect → Pending Audit → Conditional (pending_veto, 24h) → Active Officer
                              ↘ Extended (pending_veto +24h, complex_investigation)
                              ↘ Vetoed (revoked_at + veto_aca)
```

### 1. Database changes (single migration)

`dao_hats` additions:
- `veto_window_end TIMESTAMPTZ` — null for legacy/active, set when hat minted in `pending_veto`
- `veto_extended BOOLEAN DEFAULT false` — true after one 24h extension
- `veto_extended_at TIMESTAMPTZ`
- `veto_reason TEXT`
- `veto_aca_hash TEXT`, `veto_aca_payload JSONB`
- `provisioned_by UUID` — who approved (peer sponsor or tophat)
- Extend `eligibility_status` enum/check with `pending_veto`, `vetoed`

`committee_applications` additions:
- `sponsor_count INT DEFAULT 0`
- `risk_score NUMERIC` — populated by Edge Function (KYC/Sybil heuristics)
- `risk_flags JSONB` — array of detector hits

New table `committee_application_sponsorships`:
- `application_id UUID FK`, `sponsor_user_id UUID`, `sponsor_aca_hash TEXT`, `created_at`
- Unique `(application_id, sponsor_user_id)`
- RLS: insert only by authenticated user who holds a Level 1 hat for that committee; read by applicant + active officers of that committee + tophat

RLS:
- `dao_hats` updates restricted: only tophat can write `veto_*` columns; auto-promotion uses a `SECURITY DEFINER` function.

New SQL functions:
- `sponsor_application(_application_id uuid)` — checks `has_hat(auth.uid(), committee.id)`, inserts sponsorship row, increments `sponsor_count`. When count ≥ 2 → calls `provision_pending_veto_hat(...)`.
- `provision_pending_veto_hat(_user uuid, _hat_type text, _provisioner uuid)` — inserts `dao_hats` row with `eligibility_status='pending_veto'`, `veto_window_end = now() + interval '24 hours'`.
- `auto_promote_pending_veto()` — flips expired `pending_veto` (and not extended-still-open) rows to `active`. Called by pg_cron every minute and lazily on read.
- `veto_hat(_hat_id, _reason, _aca_hash, _aca_payload)` — tophat-only; sets `eligibility_status='vetoed'`, `revoked_at=now()`.
- `extend_veto(_hat_id, _reason)` — tophat-only; requires `veto_extended=false`; pushes `veto_window_end += 24h`, sets `veto_extended=true`.

Pg_cron job to invoke `auto_promote_pending_veto()` each minute.

### 2. Edge Functions

- **`ascension-risk-scan`** (invoked on application insert via trigger → `net.http_post`): runs KYC/Sybil heuristics, writes `risk_score` + `risk_flags`.
- **`ascension-provision-hat`** (replaces inline insert in `handleSubmission` for non-tophat sponsor-reaches-2 path): calls `relay-governance-action` (mint Hat on-chain in `pending_veto`), then writes `dao_hats` row. Service-role; enforces sponsor count ≥ 2 OR caller has tophat.
- **`ascension-veto`**: tophat-only; calls `revokeHat` via `relay-governance-action`, runs `veto_hat()` SQL with generated Veto ACA payload.
- **`ascension-auto-promote`**: HTTP entry that wraps `auto_promote_pending_veto()` (idempotent backup to pg_cron). Called lazily by UI when a user opens the dashboard with an expired conditional hat.

### 3. UI changes

**`src/components/governance/CommitteesList.tsx`** — extend existing card states:
- New state `conditional`: when the user holds a `pending_veto` hat → badge "Conditional Ascension · Veto window ends in Xh Ym" with disabled execution affordances.
- Render `sponsor_count / 2` chip on pending applications.
- "Sponsor this Ascension" button visible when current user holds a Level 1 hat for that committee AND viewing the Compliance Queue, calls `sponsor_application` RPC (with ACA hash for `committee_sponsor_<id>`).
- Keep existing tophat override path; it now mints directly as `active` (skips veto window).

**New `src/components/governance/ComplianceQueue.tsx`** (mounted in `GovernanceScreen` for tophat holders, with a smaller "My Ascension Status" view for everyone):
- Lists all `pending_veto` hats with countdown, `risk_score`, `risk_flags`, sponsor list.
- Buttons: **Veto** (opens reason modal → calls `ascension-veto`), **Extend Veto +24h** (disabled if already extended), **Allow to Promote Now** (tophat-only).
- High-alert red border when `risk_score` exceeds threshold.

**New `src/components/governance/AscensionStatusCard.tsx`** — surfaced on the user's own row:
- "Conditional Ascension" pill, live countdown, link to resignation ACA hash, explanation that voting/treasury actions are blocked until promotion.

**Gating downstream actions**: in `ActiveProposalsList`, `ProposalForm`, and `relay-governance-action` callers, treat only `eligibility_status='active'` hats as conferring rights. `pending_veto` is read-only.

### 4. Files touched

- `supabase/migrations/<new>.sql` (schema, RPCs, cron, RLS)
- `supabase/functions/ascension-risk-scan/index.ts` (new)
- `supabase/functions/ascension-provision-hat/index.ts` (new)
- `supabase/functions/ascension-veto/index.ts` (new)
- `supabase/functions/ascension-auto-promote/index.ts` (new)
- `src/components/governance/CommitteesList.tsx` (sponsor button, conditional badge, count chip)
- `src/components/governance/ComplianceQueue.tsx` (new)
- `src/components/governance/AscensionStatusCard.tsx` (new)
- `src/components/GovernanceScreen.tsx` (mount ComplianceQueue + AscensionStatusCard)
- `src/components/governance/HatsWardrobe.tsx` (render `pending_veto` as a distinct "Conditional" state next to active/grayed/severed)
- `src/components/governance/ActiveProposalsList.tsx` / `ProposalForm.tsx` (gate on `active`, not just hat presence)

### Open question

Do you want the **Extend Veto** to require a written `veto_reason` (stored + hashed into a new ACA) every time, or only on the first extension? My recommendation: require it on extension to keep the audit trail bulletproof for the Delaware MSA defense.