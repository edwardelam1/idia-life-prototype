# Restore data-sale payouts in Wallet history and label them USDC

## What's wrong (checked against the live data)

- New payouts are being recorded: 127 completed data-sale payouts in the last 14 days, the most recent on Sep 27 (sale `SYN-6DB9AB58`, 0.025 USDC each to 6 people).
- The history hides them. Those new rows store the amount in the main amount field, have no asset tag, leave the USDC amount empty, and set the IDIA amount to 0. The history reads the amount from the IDIA field first, gets 0, and the "hide zero rows" rule then drops the row. The matching IDIA royalty rows are dropped the same way. This affects every user.
- Older payouts come from the old earnings records, which have no currency. When a record has no currency the history falls back to "USD", so those rows show as Fiat / USD.

## How IDIA Token payouts work (checked in the code)

- Every contributor share is paid twice: once in **USDC** and once in the **IDIA Token**, at a 1:1 ratio. For each 0.025 USDC paid, 0.025 IDIA Tokens are sent from the Ecosystem Escrow (`share in micro-USDC × 10^12` token units, 18 decimals).
- The settlement records the token count in the ledger row's main amount, on an `idia_royalty_yield` row that is separate from the USDC row.
- The old `amount_idia_usd` field refers to IDIA-USD, the planned stablecoin. It has nothing to do with the IDIA Token and is always 0 on these rows. Reading it is why the payouts show as zero and get hidden.
- The IDIA Token balance at the top comes from `wallets.idia_token_balance`. The history won't change it.

## Fix (Wallet history only)

1. **Payouts come back.** For `data_sale_payout` and `idia_royalty_yield` rows, take the amount only from the ledger's main amount field. `amount_idia_usd` is never read for these rows.
2. **Correct labels.**
   - `data_sale_payout` shows as **USDC**, e.g. "+0.03 USDC", with the rail shown as Crypto · USDC.
   - `idia_royalty_yield` shows as **IDIA Token**, e.g. "+0.025 IDIA" (4 decimals), with the rail shown as Crypto · IDIA Token. It is never labelled IDIA-USD.
   - Both show as positive income. Failed rows stay hidden, as they are now.
3. **No more Fiat/USD for payouts.** The older earnings rows that have no currency show **USDC**, not "USD". Any row without a currency falls back to USDC.
4. **IDIA-USD kept separate.** A generic ledger row labelled "IDIA" only because of `amount_idia_usd` is now labelled **IDIA-USD**, not IDIA Token. It only appears if that field is actually non-zero.
5. The hidden corporate and war-chest rows, pending-consent rows, the zero-row rule, the date sort and the balances stay as they are.

## Technical details

- `EnhancedWalletDashboard.tsx` `mappedSynapseRows`: branch on `syn.transaction_type` first. `data_sale_payout` → source `USDC` and amount `Math.abs(Number(syn.amount))`. `idia_royalty_yield` → source `IDIA` (IDIA Token) and amount `Math.abs(Number(syn.amount))`. Skip rows whose `status` is `failed`.
- Generic fallback: use `amount_usdc` only when it's non-null and non-zero. Use `amount_idia_usd` only when it's non-zero, with source `IDIA-USD`. Otherwise use `amount`.
- `formatAmount`: add `IDIA-USD` formatting (2 decimals, "IDIA-USD").
- `mappedTx`: the fallback currency becomes `"USDC"`.
- Receipt "Asset Rail": `USDC` → "Crypto · USDC", `IDIA` → "Crypto · IDIA Token", `IDIA-USD` → "Crypto · IDIA-USD".
- No database, edge function or settlement changes.
