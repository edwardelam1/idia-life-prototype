<final-text>
# Production pipeline repair plan

## What I found
- `apple-health-sync` is validating the ACA record against the wrong identifier. It checks `user_aca_records.platform_guid = user_id`, but the app stores ACA records using `profiles.platform_guid`. Live DB evidence shows new ACA records being created, but no matching new `raw_health_data` after the latest attempts.
- The health pipeline is split across multiple competing paths:
  - `apple-health-sync`
  - `health-data-bridge` -> `comprehensive-apple-health-processor`
  - `idia-synapse` -> `anonymization-processor`
- `anonymization-processor` is still partly legacy: it writes `staged_health_data`, also writes `staged_data`, and triggers reward processing off the wrong model.
- `staged_health_data` has multiple conflicting live triggers. One posts the wrong payload to `process-staged-data`, and another uses the legacy reward path that credits `synapse_credit_ledger` instead of `user_wallets.cash_balance`.
- Live rows confirm the payout break: recent `staged_health_data` rows have `reward_amount=0.82` and `reward_calculated=true`, but the active user’s `user_wallets.cash_balance` has not moved, and recent transactions are only `0.00` Apple Health sync markers.

## Fix plan
1. **Make one canonical Apple Health path**
   - Fix `apple-health-sync` so DELT/ACA verification uses the user’s `platform_guid`.
   - Normalize accepted Apple Health records into `raw_health_data` with correct lifecycle fields (`processing_status`, timestamps, `processed`).
   - Remove split behavior so Apple Health does not bounce between multiple processors.

2. **Repair anonymization and staging**
   - Rewrite `anonymization-processor` so health data writes only to `staged_health_data`.
   - Remove any health-path dependency on `staged_data`.
   - Fix pseudonym generation so it always uses the same deterministic hash as `generate_pseudonym()`.
   - Keep `anonymize-and-stage-data` operational for its actual Strava use, but align it with the current settlement flow and remove any confusion with Apple Health processing.

3. **Clean the live trigger chain**
   - Drop the conflicting `staged_health_data` triggers/functions that:
     - send the wrong payload body
     - use the legacy capped reward logic
     - credit the wrong ledger
   - Keep one production trigger on `staged_health_data` that invokes `process-staged-data` with a valid `staged_data_id`.

4. **Fix reward dissemination**
   - Ensure `process-staged-data` resolves the real `user_id` from `raw_health_data` first, then fallback pseudonym lookup.
   - Make the payout idempotent so retries cannot double-pay.
   - Only mark settlement success after the `transactions` row and `user_wallets.cash_balance` update both succeed.

5. **Fix the Apple Health UI**
   - `AppleHealthModal.tsx`: remove the duplicate Steps card and show steps / heart rate / calories from the real response.
   - `DataSourceModal.tsx`: stop calling `apple-health-sync` with placeholder payloads and route Apple Health only through the real modal/native sync flow.

6. **Backfill production data**
   - Reprocess recent `raw_health_data` rows still stuck in `pending`.
   - Re-run settlement for recent `staged_health_data` rows that got a reward value but never produced a cash payout.
   - Verify the affected live user receives the missing wallet credit.

## Files / resources to update
- `supabase/functions/apple-health-sync/index.ts`
- `supabase/functions/anonymization-processor/index.ts`
- `supabase/functions/anonymize-and-stage-data/index.ts`
- `supabase/functions/comprehensive-apple-health-processor/index.ts`
- `supabase/functions/idia-synapse/index.ts`
- `supabase/functions/process-staged-data/index.ts`
- `supabase/functions/calculate-enhanced-rewards/index.ts`
- `supabase/functions/credit-user-wallet/index.ts`
- `src/components/AppleHealthModal.tsx`
- `src/components/DataSourceModal.tsx`
- New migration to remove/replace broken `staged_health_data` triggers and remaining health-path `staged_data` dependencies

## Technical details
The target production flow should become:

```text
AppleHealthModal / native app
  -> apple-health-sync
  -> raw_health_data
  -> anonymization-processor
  -> staged_health_data
  -> process-staged-data
  -> calculate-enhanced-rewards
  -> credit-user-wallet
  -> user_wallets.cash_balance + transactions
```

This is a real production fix, not a workaround. The main issue is that the live system currently has overlapping processors and overlapping triggers, so even when rows are created, the wrong reward path can mark them as rewarded before cash dissemination happens.

Once implemented, a new Apple Health sync should:
- pass ACA verification
- insert new `raw_health_data`
- create `staged_health_data`
- calculate reward once
- create a real cash transaction
- increment `user_wallets.cash_balance`
- show the synced metrics correctly in the popup
</final-text>