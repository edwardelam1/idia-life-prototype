# Wire Pure Alpha to the Double-Entry Ledger

## Verified current state

The accounting layer now exists in this database: `gl_accounts` (code, name, type, subtype, normal_balance, parent, business_id), `journal_entries` (entry_date, period, source, source_id, memo, posted_at, reversed_by), `journal_lines` (debit, credit, currency, fx_rate), plus `accounting_periods`, `expenses`, `bank_accounts`, `bank_transactions`, `fixed_assets`, `accruals`.

All of these tables are currently empty (0 rows), as are `pos_transactions`. So the panels will render real structure with honest empty states until IDIA Pay starts posting entries.

Pure Alpha today: the P&L Fusion chart plots HRV against `fiat_ledger` amounts, and Balance Sheet / Cash Flow are static placeholder text.

## What to build

### 1. Financial data hook
New `src/hooks/useBusinessFinancials.ts`:
- Resolve the user's active business (same `employees` lookup already used for the Org Admin gate) and expose `businessId`.
- P&L: join `journal_lines` to `journal_entries` for the business, last 6 periods, aggregate by `period` and account `type` — revenue = credit − debit on revenue accounts, expense = debit − credit on expense accounts, net income = revenue − expense.
- Balance Sheet: balances as of today grouped into assets / liabilities / equity using each account's `normal_balance`, with a computed total check (assets = liabilities + equity).
- Cash Flow: `bank_transactions` for the business grouped by month and by operating / investing / financing (from `category`, defaulting unmapped rows to operating), with net change.
- Loading, error and `isEmpty` flags so panels can distinguish "no ledger yet" from "not authorized".

### 2. P&L Fusion panel
Keep the bio-state overlay but source revenue from the ledger instead of `fiat_ledger`: bars = period revenue (and a second series for expense), line = HRV, so the fusion story stays intact. Add a small header strip: revenue, expense, net income for the latest period.

### 3. Balance Sheet panel
Replace the placeholder with three grouped account lists (Assets, Liabilities, Equity) showing code, name and balance, section subtotals, and a balanced/unbalanced indicator.

### 4. Cash Flow panel
Replace the placeholder with operating / investing / financing subtotals, net change in cash, and a short list of recent bank transactions.

### 5. Empty and gated states
- No org-admin membership: keep the existing "IDIA Pay Org Admin Sync Required" copy.
- Org admin but no ledger rows: "Ledger connected · Awaiting first posted entry" instead of a blank chart.

No mock or seeded numbers anywhere — every figure comes from the ledger tables.

## Technical notes

- Files: new `src/hooks/useBusinessFinancials.ts`; edits to `src/components/pro/PureAlphaDashboard.tsx` (fusion, balance, cash views only).
- Styling stays on the Gov palette already in use (teal `hsl(178,42%,32%)` primary, orange accents, `bg-card` surfaces, black uppercase micro-labels).
- No migrations — the schema is already in place. Reads are scoped by `business_id` and rely on existing RLS.
