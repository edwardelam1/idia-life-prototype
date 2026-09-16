# Hide zero-value rows from Wallet history

## What you'll see

- Any history row whose total is zero disappears from the list — no more "0 IDIA" entries.
- Your real USDC and IDIA royalty payouts, Synapse purchases, and credit deductions stay exactly as they are now, with their proper amounts.
- Balances shown at the top of the Wallet are untouched.

## How it works

In the Wallet history builder (`EnhancedWalletDashboard.tsx`), after both the transaction rows and the Synapse ledger rows are mapped and the hidden-description filter runs, add one more filter that drops any row where the final displayed amount is not a finite non-zero number.

Details:
- Apply the check to the combined list, so it covers both sources.
- Treat values that round to zero at display precision as zero (compare `Math.abs(amount)` against a small epsilon rather than strict `!== 0`), so a row that renders as `0.00` is removed too.
- Keep the existing sort and the existing hidden-description exclusions unchanged.
- No database, edge function, or balance-calculation changes.
