# What the database actually shows

Querying `dao_hats` and `committee_applications` for user `f60af0ab-2309-4846-a1d6-2d3dd72614d6` (committee `legal_defense`):

**`committee_applications`** — 1 row:
- `id c8305467…` · `status = approved` · `committee_id = legal_defense` · created `02:24:21`

**`dao_hats`** — 2 rows for the same `(user_id, hat_type='legal_defense')`, both `revoked_at = null`:
- `deb182d4…` · `pending_veto` · veto_window_end **2026-06-02** (72h window) · created `02:38:42.873`
- `8f01c116…` · `pending_veto` · veto_window_end **2026-05-31** (**24h** window) · created `02:38:44.233`

Two pending_veto hats provisioned 1.4s apart, with different veto-window lengths → two distinct code paths fired against the same approved application.

# Why the user still sees "Apply to Join"

`src/components/governance/CommitteesList.tsx` (lines 376–469) computes per-committee state for the applicant from:

- `isActiveMember = userActiveHats.has(committee.id) || ascensionLevel === 3`
  - `userActiveHats` is populated only when `eligibility_status === "active"` (line 121)
- `isPending = !!app && app.status === "pending"`

After your L3 approval: application is `approved`, hat is `pending_veto`. Neither branch matches, so the card falls through to the `Apply to Join` button. There is **no UI state for "hat provisioned, in veto window."** That's the user-visible bug.

# Why two hats were created

`ascension-approve` guards against duplicates (lines 108–119) but:
1. No DB-level uniqueness on `(user_id, hat_type)` when `revoked_at IS NULL` — concurrent invocations race past the in-function check.
2. The 24h-vs-72h discrepancy proves the second insert didn't come from `ascension-approve` (which uses `VETO_WINDOW_MS = 72h`). Something else with a 24h window also wrote a `pending_veto` row — likely a stale/duplicate handler or an auto-promotion path. Needs to be located via `provisioned_by` / log inspection.

# Proposed fixes (two layers)

### 1. UI: recognize `pending_veto` state (frontend only)
In `CommitteesList.tsx`:
- Track `pending_veto` hats per committee for the current user (extend the `dao_hats` hydration to capture `eligibility_status` + `veto_window_end` for `user.id`).
- Add a render branch between `isActiveMember` and `isPending`: when the user holds a `pending_veto` hat for that committee, show a **"Provisioned · Veto Window"** chip with the countdown to `veto_window_end` instead of `Apply to Join`. No new actions — view only.

### 2. DB: prevent duplicate pending_veto/active hats (migration)
Add a partial unique index so the race in `ascension-approve` can't silently succeed twice and any rogue secondary writer fails loudly:

```sql
CREATE UNIQUE INDEX dao_hats_one_live_hat_per_user_committee
ON public.dao_hats (user_id, hat_type)
WHERE revoked_at IS NULL
  AND eligibility_status IN ('pending_veto','active');
```

Then clean the existing duplicate: revoke the 24h-window row (`8f01c116…`), keeping the canonical 72h `deb182d4…` from `ascension-approve`:

```sql
UPDATE public.dao_hats
SET revoked_at = now(), eligibility_status = 'revoked'
WHERE id = '8f01c116-e840-42e3-8102-3b21a467cd35';
```

### 3. Locate the second writer (investigation, no code change yet)
Grep edge functions + client code for any other `dao_hats` insert with `eligibility_status: 'pending_veto'` or a 24h veto window, and surface findings before patching. Candidates to inspect: `dao-hat-eligibility`, `ascension-promote`, anything triggered from `ApplicationReviewQueue` on approve.

# Out of scope
- Compliance queue logic, ascension-promote, ascension-veto, ACA generation.
- Any change to the applicant's permission to apply to other committees.

# Files touched (build phase)
- `src/components/governance/CommitteesList.tsx` — add pending_veto branch + state.
- `supabase/migrations/<new>.sql` — partial unique index + cleanup UPDATE.
- Investigation report in chat for the duplicate-writer source before any further edit.
