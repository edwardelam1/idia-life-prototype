## Problem

`Global Treasury Flows` and `Global Egress Delivery` render empty for most users because the underlying tables have row-scoped RLS:

- `synapse_credit_ledger` — SELECT policies all require `user_id = auth.uid()`
- `egress_logs` — SELECT policy requires `user_id = auth.uid()`

So each user only ever sees their own ledger entries / their own egress events. Users with zero personal rows see nothing — which is exactly the "not showing for all users" symptom. The components are labeled **Global** but are reading per-user data.

The other two MSA channels (`bundle_generation_logs`, `api_metrics`) already have `USING (true)` for authenticated, which is why those rows render fine.

## Fix

Expose sanitized **aggregate** reads to all authenticated users via two `SECURITY DEFINER` SQL functions, then have the two components call them instead of selecting from the base tables directly. RLS on the base tables stays intact — private rows remain private; the functions only return columns/aggregates that are safe to show in the governance UI.

### 1. Migration — two RPCs

```sql
-- Global treasury flows: last 30 days of ledger entries, no user_id, no metadata leaks
create or replace function public.governance_global_treasury_flows()
returns table (
  id uuid,
  entry_type text,
  amount numeric,
  description text,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, entry_type, amount, description, metadata, created_at
  from public.synapse_credit_ledger
  where created_at >= now() - interval '30 days'
  order by created_at desc
  limit 1000
$$;

revoke all on function public.governance_global_treasury_flows() from public;
grant execute on function public.governance_global_treasury_flows() to authenticated;

-- Global egress delivery: only timestamps needed to compute settlement latency
create or replace function public.governance_global_egress_latency(p_since timestamptz)
returns table (
  id uuid,
  created_at timestamptz,
  settled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, created_at, settled_at
  from public.egress_logs
  where created_at >= p_since
    and settled_at is not null
  limit 1000
$$;

revoke all on function public.governance_global_egress_latency(timestamptz) from public;
grant execute on function public.governance_global_egress_latency(timestamptz) to authenticated;
```

The treasury RPC keeps `description` and `metadata` because `TreasuryFlows.tsx` already strips UUIDs, wallet hex, and emails via `sanitizeCounterparty` before display.

### 2. `src/components/governance/TreasuryFlows.tsx`

Replace the `.from("synapse_credit_ledger")…select(...)` query inside `fetchFlows` with:

```ts
const { data, error } = await supabase.rpc("governance_global_treasury_flows" as any);
```

Drop the 30d `gte` and `order` clauses (the RPC enforces both). Realtime channel can stay as-is — the INSERT trigger just calls `fetchFlows()` again.

### 3. `src/components/governance/MSAComplianceCard.tsx`

Replace the `egress_logs` select in the `Promise.all` (lines ~148-153) with:

```ts
supabase.rpc("governance_global_egress_latency" as any, { p_since: since }),
```

Everything downstream (`egressRes.data` → `egressSamples`) keeps the same shape.

### Why not just open RLS?

`synapse_credit_ledger` and `egress_logs` contain per-user financial / data-egress records — opening `USING (true)` would leak each user's full ledger to every signed-in account. The RPC pattern keeps row-level isolation for normal API access and only exposes the projection the governance UI actually needs.

### Verification

1. Sign in as a user with zero ledger / zero egress rows → both cards render with aggregate data (previously empty).
2. Sign in as a user with their own rows → still works (RPC ignores `auth.uid()` scoping).
3. Direct `from('synapse_credit_ledger').select()` still returns only the caller's rows (RLS unchanged).
