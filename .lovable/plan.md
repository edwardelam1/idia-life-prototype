# Pro Tab: Paywall Header Fit + Pure Alpha Org Admin Gate

## 1. Paywall hero header overflow

"Unlock Your Edge" renders at `text-4xl font-black` next to a fixed 40px shield icon inside the teal hero card, so on narrow devices the title crowds the icon and the shield pushes past the card padding.

Fix in `src/components/pro/ProPaywall.tsx`:
- Scale the title responsively (`text-2xl sm:text-3xl`) and allow it to wrap instead of `truncate`.
- Constrain the text block with `min-w-0 flex-1` and give the shield `shrink-0` plus a smaller size (`w-8 h-8`) with right-side breathing room so it stays inside the rounded frame.
- Apply the same treatment to the other Pro hero cards only if the identical overflow shows there (HRI, CPM, Pure Alpha use the same pattern).

No copy, tier, or pricing changes.

## 2. Pure Alpha wrongly shows "IDIA Pay Org Admin Sync Required"

Confirmed cause: `PureAlphaDashboard.tsx` sets the `hasIdiaPayOrgAdmin` flag only from `user.app_metadata.role === 'org_admin'`. That JWT claim is not populated by this app. The real membership lives in the `employees` table, which does contain an active `org_admin` row for IDIA Data Inc. — so the flag is always false even for a genuine Org Admin.

Fix:
- Resolve the flag from business membership instead of the JWT claim: query `employees` for the signed-in user with `status = 'active'` and an org-admin platform role (reusing the same normalization as `useBusinessMembership`, which accepts `org_admin` / `Org Admin` / `admin`).
- Keep the `app_metadata` check as an additional allow path so nothing regresses.
- Keep the "Sync Required" copy for users who genuinely have no business membership.

Once the gate passes, the P&L Fusion, Balance Sheet and Cash Flow panels will render their empty states from real data rather than the lock message.

## 3. IDIA Pay finance tables — current state and recommendation

What exists in this database today: `pos_transactions`, `invoices`, `invoice_line_items`, `sales_analytics`, `fiat_ledger`, `financial_event_log`, `business_wallets`, `suppliers`, `purchase_orders` / `purchase_order_line_items`, `employee_timesheets`.

What does not exist: any double-entry accounting layer. There is no chart of accounts, no journal, no expense/bill records, and no period close. Revenue can be derived, but a real P&L, balance sheet and cash flow cannot.

Recommended minimum schema to build in the IDIA Pay Lovable instance:

- `gl_accounts` — code, name, type (asset/liability/equity/revenue/expense), subtype, normal balance, parent account, business_id.
- `journal_entries` — business_id, entry_date, period (yyyy-mm), source ('pos','invoice','payroll','manual','settlement'), source_id, memo, posted_at, reversed_by.
- `journal_lines` — journal_entry_id, gl_account_id, debit, credit, currency, fx_rate. Enforce per-entry debit = credit with a trigger.
- `expenses` / `vendor_bills` — vendor, category, amount, tax, paid_at, payment_method, attachment path.
- `bank_accounts` and `bank_transactions` — for cash-flow actuals and reconciliation against `fiat_ledger` / `business_wallets`.
- `accounting_periods` — business_id, period, status (open/closed), closed_at, to freeze reported numbers.
- Optional but valuable: `fixed_assets` (depreciation schedules) and `accruals` so the balance sheet is not cash-only.

Derived reads for the three Pure Alpha displays:
- P&L Fusion: revenue and expense accounts summed by period from `journal_lines`, joined against the health/performance series already charted.
- Balance Sheet: asset/liability/equity account balances as of a date.
- Cash Flow: `bank_transactions` grouped into operating / investing / financing, or indirect method from net income plus working-capital deltas.

Posting rule: every `pos_transaction`, `invoice`, payroll run and settlement should emit a journal entry via trigger or edge function, so the ledger is the single source of truth and the Pure Alpha panels read only from it.

## Technical notes

- Files changed in this app: `src/components/pro/ProPaywall.tsx` (layout only) and `src/components/pro/PureAlphaDashboard.tsx` (membership lookup for the gate).
- No migrations run here; the finance schema is a recommendation for the IDIA Pay project.
