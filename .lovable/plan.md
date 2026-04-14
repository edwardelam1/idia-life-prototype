

# Remap "My Data" Page to Cash Balance + Add cash_balance Column

## Problem
The My Data page (DataDashboard) currently shows `total_earned` from `user_wallets` labeled as "IDIA-USD". The request is to remap this to show the `cash_balance` field instead, labeled as "Cash Account" with a USD icon. The `user_wallets` table currently lacks a `cash_balance` column.

## Changes

### 1. Database Migration
Add `cash_balance` column to `user_wallets` table (defaulting to 0), mirroring the existing column on the `wallets` table.

```sql
ALTER TABLE public.user_wallets ADD COLUMN cash_balance numeric DEFAULT 0 NOT NULL;
```

### 2. `src/components/DataDashboard.tsx`
- Change the wallet fetch to read `cash_balance` instead of `total_earned` for the summary card
- Update label from `"Total Data Earnings"` / `"IDIA-USD"` to `"Cash Account"` / `"Available Cash"`
- Replace the `DollarSign` icon styling context (keep icon, it's already USD-appropriate)
- Update the display format from `$X.XX IDIA-USD` to `$X.XX USD`

### 3. `src/hooks/useWalletBalance.ts`
- Map `cash_balance` from the DB column: `cash_balance: walletData.cash_balance || 0`
- This feeds any component using the hook (including WalletDashboard's three-pillar view)

### 4. `src/components/WalletDashboard.tsx`
- Update `fetchBalances` to read from the `wallets` table (already does) — no change needed here since it already reads `cash_balance` from `wallets`
- The three-pillar layout (Cash / IDIA-BETA / IDIA Token) remains intact

## Summary

| File | Change |
|------|--------|
| Migration SQL | Add `cash_balance` to `user_wallets` |
| `src/components/DataDashboard.tsx` | Swap earning source to `cash_balance`, update labels to "Cash Account" / "USD" |
| `src/hooks/useWalletBalance.ts` | Map `cash_balance` from DB column |

