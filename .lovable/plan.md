# Fix the data-sale payout math

## What the last sale actually did

Sale `SYN-D97A6466` (and its twin `SYN-371E8458`, both at 01:20-01:22 UTC today) each charged $0.75 and:

- Paid the 60% company share, the 10% war-chest share and every contributor share **twice** — two separate on-chain transfers per person, about 35 seconds apart (e.g. `0x0f4a3a…` then `0xd1a225…` to the same person). Each $0.75 sale actually moved $1.50 worth of splits.
- Split the contributor share evenly across a fixed list of **9 people** supplied by the Hub, while the sale record itself lists only **2 consent records**, owned by 2 people. 22 people in Life have consent records at all.

Both problems are confirmed from the database, not inferred.

## Cause

1. **Two triggers, one sale.** `settlement_queue` has two AFTER INSERT triggers that both call the payout function: `trg_dispatch_settlement_queue` and `trigger_circular_settlement`. Every queued sale is settled twice, and the payout function has no "already paid this reference" check — the relayer lock only stops them running at the same moment, not one after the other.
2. **Life trusts the Hub's contributor list.** The payout function pays whatever `contributing_users` the Hub sends and divides the pot evenly by list length. It never looks at which consent records the sale actually consumed.

## Fix

**1. One payout per sale**
- Drop the duplicate trigger `trigger_circular_settlement`, keeping the single dispatcher.
- Add a hard guard in the payout function: before any chain work, re-read the queue row and stop if it is already `completed`, or if contributor payout rows for that reference already exist in the ledger. Second calls return "already settled" and spend nothing.

**2. Pay the people whose records were used**
- At payout time, Life resolves the sale's own egress record (the buyer plus the nearest pending egress row within a two-minute window of the queue entry) and reads its list of consent-record references.
- Those references are looked up in `user_aca_records` to get the real owners, de-duplicated.
- The contributor pot (30%) is split evenly across those owners only. With the last sale that is 2 people, not 9.
- If no egress record can be matched, the run does **not** silently fall back to the Hub's list: it stops, marks the queue row `failed` with the reason, and nothing is paid. No guessing, no synthetic contributors.
- Owners without a wallet keep the existing `pending_wallet` rows so the recovery job pays them later.

**3. Close the loop on the sale record**
- Once settled, stamp the matched egress row `settlement_status = 'SETTLED'` with the sale reference, so a later run can never re-match and re-pay the same sale.

## Note for the Hub team (no change here)

The sale record only listed 2 consent records even though the answer summarised 46,409 health samples. Life now pays exactly what that list says, so if the Hub's query genuinely reads many people's data, the Hub must record every consumed consent record on the egress row — otherwise those contributors will keep being left out. I can write that up for them.

## Technical notes

- Migration: `DROP TRIGGER trigger_circular_settlement ON public.settlement_queue` (keeps `trg_dispatch_settlement_queue`).
- `supabase/functions/idia-circular-settlement/index.ts`:
  - New `IDEMPOTENCY_CHECK` step after the queue stamp — `settlement_queue.status = 'completed'` or any `synapse_credit_ledger` row whose description contains the reference → return early.
  - New `RESOLVE_CONTRIBUTORS` step replacing the payload list: select `aca_record_references` from `egress_logs` where `user_id = buyer_id` and `settlement_status = 'PENDING'` and `created_at` within ±120s of the queue row, newest first; join `user_aca_records.aca_hash_key` → `platform_guid`; distinct owners drive `perContributorYield = total * 0.3 / owners.length`.
  - `contributing_users` from the payload is kept only for logging the discrepancy.
  - Egress row updated to `SETTLED` after the contributor loop, alongside the existing queue completion write.
- No change to the split percentages, the escrow/IDIA award path, or the pending-wallet recovery job.
- Existing double payments from today are not reversed; this only stops it happening again.
