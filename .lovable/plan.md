

# Global Synapse Settlement Model (SPEC-AI.5.2)

Replace the flat-fee reward engine with a universal settlement model: every Synapse credit consumed triggers a weighted cash payout at $0.75/credit with 30% revenue share.

---

## What Changes

Three edge functions get rewritten to implement the new economic model. No database migrations needed — `user_wallets.cash_balance` is already live.

---

## Technical Details

### 1. `calculate-enhanced-rewards/index.ts` — Global Reward Engine

**Full rewrite.** Remove the flat daily rate logic and implement pool-based math.

- Accept `{ staged_data_id, credits_spent }` (default `credits_spent = 1` for backward compat)
- Hardcode constants: `CREDIT_VALUE_USD = 0.75`, `REVENUE_SHARE_PERCENT = 0.30`
- Pool calculation:
  ```text
  totalValueUSD = credits_spent * 0.75
  REVENUE_SHARE_POOL = totalValueUSD * 0.30
  ```
- Fetch `staged_data` record; extract `data_quality_score` and `data_completeness_score` (fall back to effort-based scoring if those columns are null — preserves compatibility with health data path)
- Participant count: query associated bundle via `marketplace_bundles` if exists, else `participantCount = 1`
- Weighting: `coefficient = (quality + completeness) / 2`
- Final: `finalReward = (REVENUE_SHARE_POOL / participantCount) * coefficient`
- Clamp: min $0.05, max $1.00
- Update `staged_data` row: set `reward_amount`, `reward_calculated = true`
- Return `{ success, reward_amount, pool_details, coefficient }`

### 2. `credit-user-wallet/index.ts` — Fiat Dissemination

**Targeted rewrite.** Redirect credits from `wallets.idia_beta_balance` to `user_wallets.cash_balance`.

- Accept `{ user_id, reward_amount }` — make `staged_data_id`, `source`, `description` optional
- Upsert into `user_wallets`: increment both `cash_balance` and `total_earned` by `reward_amount`
- If no `user_wallets` row exists, insert one with the reward as initial `cash_balance`
- Stop touching `wallets.idia_beta_balance` entirely (legacy balances stay frozen)
- Transaction record: use `source` param (default `'fbo_dissemination'`) and `description` param (default `'Synapse consumption reward'`)
- Validation: only require `user_id` and `reward_amount`; remove hard requirement on `staged_data_id`

### 3. `process-staged-data/index.ts` — Orchestration Fix

**Targeted edits** to fix the handshake between the two functions above.

- Pass `credits_spent` (default `1`) into `calculate-enhanced-rewards` invocation
- Fix response mapping: `rewardResult.reward_amount` (not `rewardResult.amount`)
- Pass optional `source` and `description` through to `credit-user-wallet`

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/calculate-enhanced-rewards/index.ts` | Full rewrite: $0.75 × 30% pool → weighted distribution |
| `supabase/functions/credit-user-wallet/index.ts` | Redirect to `user_wallets.cash_balance`, make `staged_data_id` optional |
| `supabase/functions/process-staged-data/index.ts` | Fix `amount` → `reward_amount`, pass `credits_spent` |
| `.lovable/plan.md` | Update to reflect Global Synapse Settlement |

