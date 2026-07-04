## Goal

Make the "Recent Activity" list in `WalletDashboard` show every money movement, not just rows from `transactions`. Royalty payouts, Synapse credit consumption, and USDC credit purchases from hub.thebigidia.com currently live in other ledger tables and never render.

## Where each activity lives (verified in DB)

- `transactions` — earn, governance_vote, payment_sent (already shown)
- `fiat_ledger` — `DATA_SALE_PAYOUT` (royalty payouts), `CREDIT_PURCHASE`
- `synapse_credit_ledger` — `USAGE`/`DEBIT` (credit consumption), `synapse_purchase`, `data_sale_payout`, `fee`, `deposit`, etc.
- `usdc_payments` — on-chain USDC transfers (sender/recipient wallet based, matched to user via `wallets.address`)

## Changes (frontend only)

**`src/components/WalletDashboard.tsx`**

1. Replace the single `fetchTransactions` with `fetchActivity` that runs four `supabase` queries in parallel:
   - `transactions` (as today)
   - `fiat_ledger` filtered by `user_id`
   - `synapse_credit_ledger` filtered by `user_id`
   - `usdc_payments` filtered by `sender_address`/`recipient_address` in the user's wallet addresses (fetch via existing `useWalletBalance` `usdcAddress` — skip if none)
2. Normalize each row into a shared shape:
   ```ts
   { id, kind, description, amount, sign: +/-, created_at, source }
   ```
   Mapping rules:
   - `fiat_ledger.DATA_SALE_PAYOUT` → "Royalty payout", +amount_usd, source "IDIA Data Marketplace"
   - `fiat_ledger.CREDIT_PURCHASE` → "Synapse credit purchase", −amount_usd, source "hub.thebigidia.com"
   - `synapse_credit_ledger.USAGE`/`DEBIT` → "Synapse credit used", −amount, source from `metadata.app` or "Synapse"
   - `synapse_credit_ledger.synapse_purchase`/`deposit` → "Synapse credits added", +amount
   - `synapse_credit_ledger.data_sale_payout` → "Royalty credited", +amount
   - `usdc_payments` where recipient = user wallet → "USDC received", +amount_usdc; sender = user wallet → "USDC sent", −amount_usdc
   - existing `transactions` mapping preserved (including the `Staged_data_reward` → "Health Data Contribution" rename)
3. Merge, sort by `created_at` desc, cap at 25 rows, render with the existing row markup. Extend `getTransactionIcon` with cases for `royalty`, `synapse_usage`, `synapse_purchase`, `usdc`.
4. Extend the realtime subscription so `wallet-live-transactions` also listens for INSERTs on `fiat_ledger` and `synapse_credit_ledger` (filter `user_id=eq.${user.id}`) and re-runs `fetchActivity`. USDC realtime is skipped (address-based filter isn't user_id).
5. Keep the loading/empty states and formatting helpers unchanged.

No schema changes, no edge-function changes, no changes to balance logic.

## Out of scope

- No changes to `useWalletBalance` beyond reading its existing `usdcAddress`.
- No changes to how any of these ledger tables are written.
- No new tables, RLS, or grants — existing RLS on each table already scopes reads to the owning user.
