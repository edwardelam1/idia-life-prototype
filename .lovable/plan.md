

# Fix: 404 Routing + ACA Architecture (DB-Propagated)

## Problems Identified

### 1. **404 on `/dashboard`** (current route in viewport)
`App.tsx` only defines `/`, `/auth`, `/onboarding`, `/settings`. Any deep link like `/dashboard` hits the `*` catch-all `NotFound`. The "main app" lives at `/` (rendered by `Index.tsx` → `MainApp`), so `/dashboard` was never wired.

### 2. **Onboarding flow ordering is correct in code, but fragile**
- OAuth (`Auth.tsx`) → redirects to `/`
- `Index.tsx` checks session, then checks SecureStorage for `user_pii_profile` → if missing, redirects to `/onboarding`
- This is correct, BUT `/onboarding` is publicly reachable without an auth check, so a deep-linked user with no session sees a broken page.

### 3. **ACA Architecture — DB does NOT propagate, UI is doing all the work**
Audited DB state for `user_aca_records`:
- **RLS is DISABLED** (`relrowsecurity = false`) — table is wide open
- Only ONE policy exists, a SELECT policy, and it has a hardcoded user UUID `217c6224-...` as a backdoor — **this is a critical security leak**
- **No INSERT policy** exists (irrelevant since RLS is off, but required once we enable it)
- **No triggers** on the table — no propagation, no lineage registration, no liability shield logging
- Frontend (`Onboarding.tsx`, `DataSourceModal.tsx`, `AppleHealthModal.tsx`) generates the hash AND inserts the row, with no DB-side enrichment

The new architecture: **UI generates the ACA hash** (proof-of-consent at the source), **DB propagates** by:
1. Auto-stamping `source_id`/`consent_scope` defaults if omitted
2. Firing the existing `register_aca_in_library()` trigger to insert into `data_lineage_index`
3. Enforcing `platform_guid = auth.uid()` via RLS

## Fix Plan

### A. Routing (`src/App.tsx`)
Add a `/dashboard` route that renders `Index` (same gate logic as `/`). This makes the app resilient to deep links and matches user expectation.

```tsx
<Route path="/" element={<Index />} />
<Route path="/dashboard" element={<Index />} />
```

### B. Auth → Onboarding ordering (`src/pages/Index.tsx`)
Already correct: OAuth lands at `/`, `Index` gates on session → PII → MainApp. No change needed beyond confirming `Auth.tsx` redirect is `/` (it is).

Add an auth guard to `/onboarding` so an unauthenticated direct hit redirects to `/auth` instead of erroring on `supabase.auth.getUser()`.

### C. ACA Architecture — DB Migration (production-grade)
Single migration that:

1. **Drop the leaky SELECT policy** with the hardcoded UUID backdoor
2. **Enable RLS** on `user_aca_records`
3. **Create proper RLS policies**:
   - SELECT: `auth.uid() = platform_guid`
   - INSERT: `WITH CHECK (auth.uid() = platform_guid)` — user can only log consent for themselves
4. **Attach `register_aca_in_library()` trigger** to `user_aca_records` AFTER INSERT — propagates the ACA hash into `data_lineage_index` (the propagation the user described)
5. **Add a BEFORE INSERT trigger** that defaults `source_id` to `consent_type` if NULL/`'unknown'` and stamps `created_at`

### D. Frontend cleanup (`src/pages/Onboarding.tsx`)
- Capture and surface the ACA insert error (currently silently ignored with no `error` destructure)
- Pass `source_id: 'sovereign_onboarding'` so lineage is meaningful

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/dashboard` route → `Index` |
| `src/pages/Onboarding.tsx` | Capture ACA error, pass `source_id` |
| `src/pages/Index.tsx` *(optional)* | No change — gate logic is correct |
| New migration | Drop leaky policy, enable RLS, add SELECT/INSERT policies, attach lineage propagation trigger |

## Out of Scope
- PII storage rules (already correct: device-only + `user_metadata`)
- Identity unification (already enforced by prior `enforce_platform_guid_equals_user_id` trigger)
- Edge functions (no changes needed; lineage propagation is now DB-side)

## Why This Is Production MVP Grade
- Removes a hardcoded user-ID backdoor in RLS (security-critical)
- Enables RLS on a previously unprotected table
- Moves propagation responsibility to the DB (single source of truth, can't be bypassed by a buggy client)
- Deep-link resilient routing
- Zero PII enters the public schema (constraint preserved)

