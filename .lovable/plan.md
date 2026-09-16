# Corporate and war-chest payouts never actually left the relayer

## What the trace found

The individual royalty payouts work. The corporate (60%) and war-chest (10%) payouts do not — and the reason is confirmed on chain, not guessed.

Verified evidence for the most recent sale (SYN-2DCD78AB, 11:30 UTC today):

- Corporate row says 0.90 USDC, transaction `0xa02c6219…`
- War-chest row says 0.15 USDC, transaction `0xe6ed1f68…`

Both transactions succeeded, but on chain they are **empty transactions with no recipient and no token movement** — recipient field is null, no transfer events, zero logs. No USDC ever moved. The same is true of the earlier sale at 03:16.

By contrast a contributor payout from the same run (`0x67dba151…`) is a real USDC transfer: it calls the USDC contract with the recipient wallet and 0.05 USDC encoded in it.

So the ledger records the corporate and war-chest amounts as settled, and the money silently stays in the relayer account. The balances you do see in those two addresses (3.075 USDC in the cash register, 8.075 USDC in the war chest) are from older runs, not from these.

## Why the two legs differ

Contributor payouts are sent with the direct contract-write path (`sendWithNonceRetry` → `writeContract`), which encodes the token, recipient and amount into the transaction.

The corporate and war-chest legs use a different helper, `executePlanckScaleTransaction`. That helper simulates the call, then hands the simulated request to a generic transaction preparer and signs it. The preparer never converts the contract call into transaction data, so the destination and the call data get dropped. What gets signed and broadcast is a bare, empty transaction — which the network accepts as successful, burning gas and moving nothing.

## The fix

1. Rewrite `executePlanckScaleTransaction` so the transaction it signs actually carries the contract call: encode the function call to raw call data and set the destination to the contract address (or, simpler and consistent with the working path, drop the helper and route both legs through `sendWithNonceRetry` + `writeContract` exactly like contributor payouts).
2. Add a post-confirmation assertion on both legs: after the receipt confirms, require that the receipt contains a token transfer event to the intended address for the intended amount. If it does not, mark the leg failed, record the failure on the queue row, and do **not** write a "completed" ledger row. A success receipt alone must never be treated as proof of payment again.
3. Apply the same assertion to the contributor loop so any future silent no-op is caught there too.

## Recovering the money that never moved

Nothing is lost — the funds are still in the relayer account (currently 7.375 USDC).

- Run a one-time audit over every `hub_protocol_fee` and `ecosystem_war_chest` ledger row (63 of each, 28.80 USDC corporate and 4.80 USDC war chest total since May), fetching each recorded transaction and classifying it as a real transfer or an empty no-op.
- Produce the exact shortfall per destination, then make a single catch-up transfer to each address for the confirmed amount, capped by what the relayer actually holds. If the shortfall exceeds the relayer balance, report the gap rather than partially paying and calling it done.
- Record catch-up transfers as new ledger rows referencing the sales they cover, so the audit trail stays honest.

## Notes

- No contract or key changes. No change to the revenue split, contributor resolution, or the individual royalty path.
- The war-chest routing decision (regional pool vs. global war chest) is unaffected; only the transfer mechanics are wrong.
