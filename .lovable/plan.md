## Problem

The `wallets` table schema changed:
- `idia_beta_balance` (numeric) was **renamed/replaced** by `stablecoin_balance` (**bigint, micro-USDC** — i.e. on-chain 6-decimal units, where `1_000_000` = `$1.00 USDC`).
- `idia_usd_balance` (numeric, dollars) still exists separately.

The frontend and two DB functions still reference the old `idia_beta_balance` column. This is silently breaking USDC display (returns 0/null) and any RPC call to `set_usdc_balance` / `increment_idia_beta_balance` will throw "column does not exist".

## Files affected

**Frontend (read/display old column):**
- `src/hooks/useWalletBalance.ts` — `WalletBalance` type, `ZERO_FLOOR`, `applyRow`, and the `.select(...)` query
- `src/components/WalletDashboard.tsx` — renders `balance.idia_beta_balance`
- `src/components/enhanced/EnhancedWalletDashboard.tsx` — sync-to-Supabase block writes `idia_beta_balance` and the UI reads `walletBalance?.idia_beta_balance`
- `src/components/enhanced/EnhancedProfileSettings.tsx` — renders `balance.idia_beta_balance`

**Database functions (still target dropped column):**
- `public.set_usdc_balance(p_user_id, p_micro_balance, p_block_number)`
- `public.increment_idia_beta_balance(x_user_id, increment_amount)`

## Plan

### 1. Fix DB functions (migration)
Rewrite both functions to write to `stablecoin_balance` instead of `idia_beta_balance`. Rename `increment_idia_beta_balance` → `increment_stablecoin_balance` (keep a thin wrapper with the old name for one release so any in-flight callers don't break, then we can drop it later).

`set_usdc_balance` already takes a `bigint` micro amount, so it just needs the column rename — no unit math change.

`increment_stablecoin_balance` should take a `bigint` micro amount (changing from `numeric`) so increments stay in the same unit as the stored value.

### 2. Update `useWalletBalance.ts`
- Rename interface field `idia_beta_balance` → `stablecoin_usdc` (a `number` representing **dollars**, not micro).
- Change the query to `.select("cash_balance, stablecoin_balance, idia_token_balance")`.
- In `applyRow`, convert micro → dollars: `Number(row.stablecoin_balance) / 1_000_000`.
- Update realtime payload handler the same way (it reuses `applyRow` so it's automatic).

### 3. Update consumers to use the new field
- `WalletDashboard.tsx` line 192 → `balance.stablecoin_usdc.toFixed(2)`
- `EnhancedProfileSettings.tsx` line 296 → `balance.stablecoin_usdc.toFixed(2)`
- `EnhancedWalletDashboard.tsx`:
  - line 359 display → `walletBalance?.stablecoin_usdc?.toFixed(2)`
  - sync block (lines ~111–149): compare/write in micro units. The on-chain `onChainUSDC.formatted` is dollars → convert to micro with `Math.round(Number(onChainUSDC.formatted) * 1_000_000)` before writing to `stablecoin_balance`. Compare against `walletBalance?.stablecoin_usdc` (dollars) to short-circuit.
  - dependency array updated to `walletBalance?.stablecoin_usdc`.

### 4. Note on `idia_usd_balance`
Leave `useEnhancedProfile.ts` as-is — it already correctly reads `idia_usd_balance` (the separate dollar-denominated rewards bucket). That column was not changed.

### 5. Types regen
`src/integrations/supabase/types.ts` is auto-managed and will refresh after the migration. No manual edit.

## Technical details

```text
OLD: wallets.idia_beta_balance (numeric, dollars)
NEW: wallets.stablecoin_balance (bigint, micro-USDC: value / 1e6 = USD)
     wallets.idia_usd_balance   (numeric, dollars — unchanged, separate bucket)
     wallets.usdc_last_synced_at, usdc_last_block (sync metadata — already used by set_usdc_balance)
```

Display rule everywhere in the wallet UI: `usd = stablecoin_balance / 1_000_000`, formatted with `.toFixed(2)`.
Write rule from on-chain reads: `micro = Math.round(dollars * 1_000_000)`.

After approval I'll run the migration for the two functions, then make the four frontend edits.
