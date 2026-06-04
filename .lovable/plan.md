# Security Hardening Plan — RLS Lockdown + ACA Read Model

## Governing rules (from your directive)

1. **Unauthenticated (`anon` / `public` role) users can do NOTHING. Ever.** Every policy currently bound to `{public}` gets rewritten or dropped.
2. **Any authenticated user may READ any table that carries an `aca_hash_key`** — but the owning `user_id` / `platform_guid` / `pseudo_user_id` UUID must be **masked** in the response so PII linkage is preserved.
3. Writes to financial / governance / system tables stay **service_role only**.
4. Users may still write their *own* rows where the existing product flow requires it (ratings, device_events, profile-owned data) — but never financial balances or ledger entries.

---

## Part 1 — Kill every `{public}` (anon-reachable) policy flagged by the scanner

Drop and replace these policies. Each replacement is `TO service_role USING (true) WITH CHECK (true)` unless noted.

| Table | Current bad policy | Action |
|---|---|---|
| `usdc_payments` | `Service role can update payments` (public, UPDATE true) | DROP → recreate `TO service_role` only |
| `fiat_ledger` | `Service role can insert fiat ledger entries` (public, INSERT true) | DROP → recreate `TO service_role` only |
| `raw_app_data` | `System can manage staged app data` (public, ALL) | DROP → recreate `TO service_role` only |
| `social_health_metrics` | `System can manage social health metrics` (public, ALL) | DROP → recreate `TO service_role`; keep owner SELECT policy |
| `business_processing_queue` | `Allow all operations for service role…` (public, ALL) | DROP → recreate `TO service_role` |
| `lifestyle_processing_queue` | same pattern | DROP → recreate `TO service_role` |
| `sync_logs` | `Allow service role to manage sync logs` (public, ALL) | DROP → recreate `TO service_role` |
| `governance_proposals` | `Service role can insert / update proposals` (public) | DROP both → recreate `TO service_role` |
| `governance_indexer_state` | `Service role can update indexer state` (public) | DROP → recreate `TO service_role` |
| `processed_operator_telemetry` | `Service roles can update spatial telemetry` (public) | DROP → recreate `TO service_role` |
| `cross_platform_insights` | `Allow authenticated read…` (public SELECT) | DROP → recreate `TO authenticated` |
| `production_queue` | `Production staff can view queue` (public SELECT) | DROP → recreate `TO authenticated` scoped by business membership via `is_business_member()` |
| `staged_business_data` | `Allow authenticated read…` (public SELECT) | DROP → recreate `TO authenticated` (or scoped by `is_business_member` if `business_id` present) |

## Part 2 — Plug financial self-mutation holes

| Table | Action |
|---|---|
| `wallets` | DROP `MVP_Client_Sync_Policy` + `Users can update their own wallet`. Authenticated users get **SELECT-only** on their own row. All balance mutations stay in existing SECURITY DEFINER functions (`increment_wallet_cash`, `increment_life_cash`, `decrement_hub_cash`, etc.) which run as service_role. |
| `synapse_credit_ledger` | DROP `Users can insert their own ledger entries`. Authenticated users keep **SELECT** on their own rows. Inserts only via `service_role` / SECURITY DEFINER functions (the existing `calculate_synapse_running_balance` trigger already handles balance integrity server-side). |
| `device_provisioning_blueprints` | DROP all four `true` policies. Recreate the 4 CRUD policies `TO authenticated` with `USING (public.is_business_member(business_id))` and matching `WITH CHECK` for INSERT/UPDATE. |
| `api_metrics` | DROP `Allow authenticated read access on api_metrics`. Recreate as `TO authenticated USING (user_id = auth.uid())`. Add a service_role ALL policy for backend writers. |
| `system_configs` | DROP `Allow authenticated read-only access`. Recreate as `TO service_role` only. (If the frontend needs feature flags, we'll surface them via a dedicated edge function — flag this for follow-up rather than re-exposing the table.) |

## Part 3 — ACA-tagged tables: universal authenticated read with UUID masking

Per your rule: any authenticated user may read any row of any table that carries an `aca_hash_key`, but the owning UUID columns must be **masked**.

Approach — do NOT loosen RLS on the raw tables themselves. Instead:

1. Identify every public-schema table that has an `aca_hash_key` column. Known set from the codebase: `user_aca_records`, `staged_health_data`, `data_lineage_index`, `egress_logs`, `delt_transfers`, `raw_health_data` (via downstream), plus any other matches discovered by introspection at migration time.
2. For each such table, create a companion **view** `public.<table>_public` that:
   - Selects all columns **except** raw owner UUIDs (`user_id`, `platform_guid`, `pseudo_user_id`, `owner_id`, `customer_id`).
   - Replaces each owner UUID with a deterministic mask: `encode(sha256((coalesce(user_id::text,'') || 'IDIA_VIEW_SALT')::bytea), 'hex')` aliased as `masked_owner`. Reuses the same masking salt across all views so a single user maps to the same `masked_owner` everywhere (community-wide cross-referencing without PII).
   - Views are defined `WITH (security_invoker = true)` so they respect the caller's RLS (avoiding the `SUPA_security_definer_view` lint).
3. Grant `SELECT` on each `_public` view to `authenticated` only (never `anon`).
4. Add a permissive `SELECT` RLS policy `TO authenticated USING (true)` on each underlying ACA-tagged table — but only after confirming the view is the *only* exposed surface (raw tables get no `GRANT SELECT TO authenticated` if they aren't already granted). Where the raw table is already accessible to its owner, keep that owner-scoped policy alongside.
5. Frontend continues to use the raw table for the owner's own data (existing RLS), and switches to `<table>_public` when displaying community/feed views.

## Part 4 — Realtime channel authorization

Add RLS on `realtime.messages` restricting subscriptions: an authenticated user can only `SELECT` realtime messages whose `topic` either (a) starts with their own `auth.uid()::text`, or (b) corresponds to a public `_public` view topic. Anon gets nothing. This closes the cross-user financial/governance leak from `synapse_credit_ledger`, `egress_logs`, `dao_votes`, etc.

## Part 5 — Misc lint cleanup tied to this migration

- Set `search_path = public` on any new SECURITY DEFINER functions we add (UUID masking helper).
- Revoke `EXECUTE … FROM PUBLIC, anon` on the masking helper; grant only to `authenticated, service_role`.
- Public storage bucket listing + leaked-password protection + Postgres upgrade are out of scope for this SQL pass (require dashboard toggles); will be reported back as follow-ups.

---

## Technical detail — migration shape

Single migration file containing, in order:

```text
1. CREATE OR REPLACE FUNCTION public.mask_owner(uuid) → text
   - SECURITY INVOKER, IMMUTABLE, search_path=public
   - Returns encode(sha256((uuid::text||'IDIA_VIEW_SALT')::bytea),'hex')
   - REVOKE EXECUTE FROM PUBLIC, anon; GRANT TO authenticated, service_role

2. For each table in Part 1/2: DROP POLICY … ; CREATE POLICY … TO service_role / authenticated as specified.

3. For each ACA-tagged table:
     CREATE OR REPLACE VIEW public.<t>_public WITH (security_invoker = true) AS
       SELECT <non-PII cols>, public.mask_owner(user_id) AS masked_owner
       FROM public.<t>;
     REVOKE ALL ON public.<t>_public FROM PUBLIC, anon;
     GRANT SELECT ON public.<t>_public TO authenticated;
     -- plus a SELECT-true policy TO authenticated on the underlying table if needed by the view.

4. realtime.messages RLS: enable + add topic-scoped policy TO authenticated, no anon access.
```

Every new/modified policy is bound to `authenticated` or `service_role` — `{public}` is never used.

## Out of scope / follow-ups (will report after migration)

- Dashboard toggles: enable leaked-password protection, upgrade Postgres.
- Storage bucket listing policy (needs per-bucket review).
- Replacing any frontend code paths that currently read raw ACA-tagged tables for community views — switch them to the new `_public` views once the migration lands.

---

**Approve this plan to proceed.** On approval I'll (a) introspect the live schema to enumerate every `aca_hash_key`-bearing table, (b) emit one comprehensive migration, and (c) re-run the security scan to confirm all errors clear.