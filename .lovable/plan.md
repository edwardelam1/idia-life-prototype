# Restore data-sale payouts in Wallet history and label them USDC

## What's wrong (checked against the live data)

- New payouts are being recorded: 127 completed data-sale payouts in the last 14 days, the most recent on Sep 27 (sale `SYN-6DB9AB58`, 0.025 USDC each to 6 people).
- The history hides them. Those new rows store the amount in the main amount field, have no asset tag, leave the USDC amount empty, and set the IDIA amount to 0. The history reads the amount from the IDIA field first, gets 0, and the "hide zero rows" rule then drops the row. The matching IDIA royalty rows are dropped the same way. This affects every user.
- Older payouts come from the old earnings records, which have no currency. When a record has no currency the history falls back to "USD", so those rows show as Fiat / USD.

## Fix (Wallet history only)

1. **Payouts come back.** When reading a ledger row, use the first amount that isn't zero (main amount, then USDC, then IDIA). A zero in an unused field is no longer treated as the amount.
2. **Label by transaction type.** Data-sale payouts (`data_sale_payout`) are labelled **USDC**, and IDIA royalty yields (`idia_royalty_yield`) are labelled **IDIA**, even when the row has no asset tag. They show as positive income with the payout icon.
3. **No more Fiat/USD for payouts.** Data-sale and earnings rows from the older records show **USDC**, not "USD". On the receipt, the "Asset Rail" line says **Crypto · USDC**. Rows that have no currency no longer fall back to "USD". They fall back to USDC.
4. The hidden corporate and war-chest rows, pending-consent rows, the zero-row rule, the date sort and the balances stay as they are.

## Technical details

- `EnhancedWalletDashboard.tsx`, `mappedSynapseRows`: check `transaction_type` first. `data_sale_payout` → source `USDC`, `idia_royalty_yield` → source `IDIA`, and in both cases amount = `Math.abs(firstNonZero(amount, amount_usdc, amount_idia_usd))`. Use the same non-zero choice in the generic fallback, so `?? 0` no longer grabs a stored zero.
- `mappedTx`: when there's no currency, use `"USDC"` instead of `"USD"`. `earn` and `data_sale*` types → `USDC`.
- Receipt dialog: when the source is `USDC` or `IDIA`, the Asset Rail shows `Crypto · {source}`.
- No database, edge function or settlement changes.
