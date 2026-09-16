# Correct Synapse consumption entries in Wallet history

## Confirmed issue

- Current corporate allocation rows are labeled **“60% Corporate Revenue: …”**, while the Wallet only hides the older **“Corp revenue Syn”** wording. Those internal rows therefore remain visible.
- Current consumption rows are ledger `USAGE` entries with a signed `amount` of `-1` credit, but they also contain `amount_idia_usd = 0`. The Wallet currently selects that zero field first and labels it as IDIA instead of using the real signed credit deduction.

## What will change

- Hide both current and legacy corporate-revenue allocation descriptions from Wallet history.
- Recognize `USAGE`, `DEBIT`, and `CONSUMPTION` ledger entries as Synapse Credit consumption.
- Read their authoritative signed value from `synapse_credit_ledger.amount`, not the zero IDIA or USDC accounting fields.
- Display consumption as a credit deduction, for example **−1 CR**, while preserving the ledger description and receipt details.
- Keep Synapse purchases as positive credit entries and leave the authoritative Synapse Credits balance calculation unchanged.

## Technical details

- Update the history exclusion matcher in `EnhancedWalletDashboard` to cover **“60% Corporate Revenue”** case-insensitively.
- Classify consumption before generic asset selection, assign the `CR` asset, and preserve the negative ledger sign.
- Keep purchase detection and Base receipt enrichment unchanged.
- Verify recent rows no longer show corporate allocations and the current `Synapse Gas: MARKETPLACE_RESEARCH … [1 CR]` record renders as **−1 CR**.