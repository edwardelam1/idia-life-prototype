# Security Hardening Plan — Revised

Changes vs prior plan (rest is unchanged and re-stated below for completeness).

## Revisions

- **`device_provisioning_blueprints`** — restricted to **IDIA C-suite / superusers only**, not business members. Uses the existing `public.is_csuite(auth.uid())` security-definer function. All four CRUD policies bound to `authenticated` and gated by `is_csuite(auth.uid())`. Service role retains full access.
  - *Open question:* you said "csuite **and** superusers". The DB currently only exposes `is_csuite()`. Should I treat "superuser" as a synonym for csuite, or do you want a second gate (e.g. a new `is_superuser()` check against a different role)? I'll proceed with `is_csuite()` only unless you say otherwise.
- **`api_metrics`** — global read for any signed-in user. Policy: `FOR SELECT TO authenticated USING (true)`. Service role retains full ALL.

---

## Part 1 — Kill every anon ({public}) policy

Drop and recreate `TO service_role` (or `authenticated` for read-only views of non-sensitive data):

| Table | Action |
|---|---|
| `usdc_payments` | UPDATE → service_role only |
| `fiat_ledger` | INSERT → service_role only |
| `raw_app_data` | ALL → service_role only |
| `social_health_metrics` | ALL → service_role; keep owner SELECT (rebound to `authenticated`) |
| `business_processing_queue` | ALL → service_role; drop public SELECT |
| `lifestyle_processing_queue` | ALL → service_role; drop public SELECT |
| `sync_logs` | ALL → service_role; drop public SELECT |
| `governance_proposals` | INSERT/UPDATE → service_role; SELECT → authenticated |
| `governance_indexer_state` | ALL → service_role |
| `processed_operator_telemetry` | UPDATE → service_role; SELECT own → authenticated |
| `cross_platform_insights` | ALL → service_role; SELECT → authenticated |
| `production_queue` | SELECT → authenticated |
| `staged_business_data` | ALL → service_role; SELECT → authenticated |

## Part 2 — Financial / sensitive lockdown

| Table | Action |
|---|---|
| `wallets` | Drop `MVP_Client_Sync_Policy` and `Users can update their own wallet`. Authenticated users keep SELECT on their own row only. Balance changes only via existing SECURITY DEFINER functions. |
| `synapse_credit_ledger` | Drop `Users can insert their own ledger entries`. Authenticated users keep SELECT on their own rows. |
| `device_provisioning_blueprints` | **Revised:** drop all 4 existing policies. Recreate 4 CRUD policies `TO authenticated` gated by `public.is_csuite(auth.uid())`. |
| `api_metrics` | **Revised:** drop existing policy. Recreate `FOR SELECT TO authenticated USING (true)` (global read). Add `FOR ALL TO service_role`. |
| `system_configs` | Drop authenticated read. Recreate ALL → service_role only. |

## Part 3 — ACA-tagged tables: universal authenticated read with UUID masking

Unchanged from prior plan.

1. New helper `public.mask_owner(uuid) → text` — `SECURITY INVOKER`, `IMMUTABLE`, `search_path=public`, returns `sha256(uuid::text || 'IDIA_VIEW_SALT_V1')` hex. Execute revoked from `PUBLIC, anon`; granted to `authenticated, service_role`.
2. Create `WITH (security_invoker = true)` views `public.<table>_public` for every ACA-tagged table (committee_applications, dao_proposals, dao_vetoes, dao_votes, data_lineage_index, governance_ledger, hat_recall_petitions, hat_recall_signatures, proposal_comments, proposal_signatures, raw_app_data, raw_health_data, staged_health_data, staged_lifestyle_data, synapse_controller, user_aca_records). Each view replaces owner UUIDs (`user_id`, `pseudo_user_id`, `platform_guid`, `entity_id`, `sovereign_uuid`, `proposer_id`, `author_id`, `actor_id`, `petitioner_id`, `signer_id`, `escalated_by`) with `mask_owner(...)` and exposes everything else.
3. `REVOKE ALL … FROM PUBLIC, anon; GRANT SELECT … TO authenticated` on every view.
4. Add `FOR SELECT TO authenticated USING (true)` on each underlying ACA-tagged table so the security-invoker view can satisfy RLS for any signed-in caller. Owner-specific policies remain intact.

## Out of scope / dashboard-only follow-ups

- Leaked-password protection toggle, Postgres version upgrade, public storage bucket listing review, `realtime.messages` channel authorization (reserved schema — needs separate handling).

---

**Approve to proceed.** I'll emit one comprehensive migration and re-run the security scan.