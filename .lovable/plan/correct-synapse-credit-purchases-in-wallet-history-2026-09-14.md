# Correct Synapse credit purchases in Wallet history

## Confirmed issue

Today’s ledger entry is a real Synapse credit purchase, but Wallet history selects its `amount_idia_usd` value of `0` before the actual credit amount. That makes the row appear as a zero-value generic credit event.

The verified purchase contains:

- **Credits purchased:** 2.6667 Synapse Credits
- **Purchase price:** $2.00 USDC
- **Rate:** $0.75 per credit
- **Wallet:** `0x429F7fd3CCd6514Cedef76DB12f7bA2151355A40`
- **Transaction:** `0x7865427a6de424d249dc9ff6bc9db884015b104e10303ea13554c4a4915d977b`
- **Base block:** `51,311,729`

## What will change

- Recognize Synapse purchases from their existing purchase metadata.
- Show the history row as **“Synapse Credits Purchase”** with **+2.6667 CR**, instead of a zero-value generic event.
- Keep debit/usage entries signed correctly and avoid changing the authoritative Synapse Credits balance calculation.
- Expand the receipt for purchases to show:
  - credits purchased
  - USDC paid
  - price per credit
  - purchasing wallet address
  - transaction hash
  - confirmed Base block number
- Resolve the block number from the stored transaction hash through Base, so future purchases show their real block without hardcoded values or database changes.
- Gracefully omit any purchase detail that an older entry does not contain.

## Technical details

- Update the Synapse ledger mapper in the Wallet history to distinguish purchases from usage and other ledger entries.
- Preserve the complete ledger record in receipt metadata and enrich records with the on-chain receipt block when a transaction hash exists.
- Format Synapse Credits as `CR`, not dollars, in both the history row and receipt amount.
- Verify today’s entry renders as `+2.6667 CR` and block `51,311,729`, while existing hidden accounting artifacts remain hidden.