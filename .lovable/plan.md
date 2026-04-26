## Root cause

`profiles.account_type` has a CHECK constraint allowing only `'individual' | 'business'`. The `syncWalletToSupabase` upsert in `src/hooks/useSovereignWallet.ts` only sends `{ id, user_id, wallet_address, updated_at }`. When the row doesn't yet exist (race with the `handle_new_user` trigger, or any path where the profile insert hasn't materialized), Postgres performs an INSERT with `account_type = NULL` → CHECK violation → error → re-render → retry → loop.

A secondary issue: the sync is wired into `useEffect` dependencies (`syncWalletToSupabase`, `globalWalletAddress`) so every failure/state change re-fires it.

## Fix

### 1. `src/hooks/useSovereignWallet.ts`
- Switch from `upsert` to a guarded **UPDATE-only** path against `profiles` (the row is guaranteed by the `handle_new_user` trigger). This removes any chance of inserting a row missing required CHECK columns.
- If the UPDATE affects 0 rows, fall back to an upsert that includes safe defaults for all CHECK-constrained columns: `account_type: 'individual'`, plus `ai_assistant_name`, `kyc_tier`, `platform_guid`.
- Add an internal guard so a second concurrent call short-circuits (prevents cascade loops).
- Keep the realtime subscription read-only (no writes inside it).

### 2. `src/components/enhanced/EnhancedWalletDashboard.tsx`
- Replace the auto-firing `useEffect` (lines ~152–161) with an **identity-gated, one-shot ref**: only call `syncWalletToSupabase` once per `(stableUserId, localAddress)` pair, tracked via a `useRef<Set<string>>`. Remove `syncWalletToSupabase` and `globalWalletAddress` from the dep array so a state change from the sync itself cannot retrigger it.

### 3. `src/pages/SecureVault.tsx`
- Same one-shot guard: track `hasSyncedRef` so `verifySovereignInfrastructure` commits the wallet exactly once per session, and remove `syncWalletToSupabase` from the `useEffect` deps.

## Why this breaks the loop

- Eliminates the CHECK violation source (no more null `account_type` inserts).
- Even if a write fails, the one-shot ref prevents re-entry; the UI surfaces a single toast instead of an infinite cycle.
- The hook no longer mutates state inside an effect that depends on its own outputs.

## Files touched

- `src/hooks/useSovereignWallet.ts` — rewrite `syncWalletToSupabase` (UPDATE-first, safe-default fallback, in-flight guard).
- `src/components/enhanced/EnhancedWalletDashboard.tsx` — one-shot ref gate, trimmed deps.
- `src/pages/SecureVault.tsx` — one-shot ref gate, trimmed deps.

No DB migration required (constraint stays as-is; the app now respects it).