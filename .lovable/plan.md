# Fix Treasury / Oracle telemetry + Committee Roster wallets

## Root cause (confirmed against DB)

Ran a grants check on the three suspect tables — **none of them have any GRANT to `anon`, `authenticated`, or `service_role`**, so PostgREST silently returns empty results even though RLS policies allow `true`:

```sql
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name IN ('dao_treasury_flows','dao_msa_metrics','profiles');
-- → 0 rows
```

1. **Treasury Flows disconnected** — `dao_treasury_flows` has 2 valid rows within the 30-day window, RLS is `USING (true)`, but no GRANT → the client gets `[]`.
2. **Oracle Telemetry · Global Hub Egress disconnected** — `dao_msa_metrics` SELECT policy is `true`, but no GRANT → client gets `[]` (the table is also empty of rows; granting will at least let the live socket and future ingest surface, and the "Awaiting Oracle Handshake" empty state will remain accurate until rows exist).
3. **Committee Roster wallets blank** — Two compounding problems on `public.profiles`:
   - No GRANT to `authenticated` at all.
   - Even after GRANT, the only SELECT policy is `auth.uid() = user_id`, so a member can never read another member's `wallet_address`. `profiles` also holds sensitive columns (`location`, `occupation`, `bio`, `kyc_status`, `trust_score`, `ein`, …) so we cannot just open up SELECT on the whole table.

## Fix

### 1. Migration — grants + a column-scoped wallet directory view

```sql
-- Restore Data API access to the two telemetry tables (policies already allow it).
GRANT SELECT ON public.dao_treasury_flows TO anon, authenticated;
GRANT ALL    ON public.dao_treasury_flows TO service_role;

GRANT SELECT ON public.dao_msa_metrics    TO anon, authenticated;
GRANT ALL    ON public.dao_msa_metrics    TO service_role;

-- Profiles base table: restore the grants its existing per-user RLS already gates.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Column-scoped public directory for governance roster lookups.
-- Wallet addresses are on-chain public identifiers, NOT PII, so they are
-- safe to expose; every other profile column stays hidden.
CREATE OR REPLACE VIEW public.member_wallet_directory
WITH (security_invoker = on) AS
  SELECT user_id, wallet_address
  FROM public.profiles
  WHERE wallet_address IS NOT NULL;

-- The view runs as the caller, so we need a dedicated permissive SELECT
-- policy on profiles that exposes ONLY the wallet identity needed for
-- governance. We add it as a second PERMISSIVE policy — the existing
-- "Users can view their own profile" policy stays untouched and still
-- gates all the sensitive columns when queried directly.
CREATE POLICY "Authenticated members can read wallet identity"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.member_wallet_directory TO authenticated;
```

Note on the extra `profiles` SELECT policy: combined with the existing self-only policy it is PERMISSIVE → OR, so authenticated users would technically be able to `SELECT *` from profiles. That re-opens the sensitive columns. To keep `wallet_address` public without leaking the rest, we keep the column-leak in check by **not** adding the broad `true` policy and instead make the view `SECURITY DEFINER`:

```sql
-- Replace the view + policy block above with this safer version:
DROP VIEW IF EXISTS public.member_wallet_directory;

CREATE VIEW public.member_wallet_directory
WITH (security_invoker = off) AS  -- runs as owner, bypasses RLS
  SELECT user_id, wallet_address
  FROM public.profiles
  WHERE wallet_address IS NOT NULL;

ALTER VIEW public.member_wallet_directory OWNER TO postgres;
GRANT SELECT ON public.member_wallet_directory TO authenticated;
-- Do NOT add the broad "true" SELECT policy on profiles.
```

This way the view exposes only two columns to authenticated users, the base `profiles` table stays locked to the row owner, and no other PII column is reachable.

### 2. Frontend — `src/components/governance/CommitteeRosterModal.tsx`

Replace the existing `.from("profiles").select("user_id, wallet_address")` lookup with the new view:

```ts
const { data: profs } = await (supabase as any)
  .from("member_wallet_directory")
  .select("user_id, wallet_address")
  .in("user_id", userIds);
```

No other component needs to change.

## Verification after deploy

- Vote tab → Delaware → Treasury Flows card renders the two existing flows and the 30-day chart.
- Vote tab → Delaware → "Oracle Telemetry · Global Hub Egress" card stops being blocked by RLS; if `dao_msa_metrics` still has 0 rows it correctly shows "Awaiting Oracle Handshake" instead of silently failing.
- Open any committee's Roster modal → other members show `0x1234…abcd` instead of `—`.

## Out of scope

- Populating `dao_msa_metrics` with live oracle data (separate ingest concern; this fix only unblocks the read path).
- Any change to how `wallet_address` is written/managed.
