
# Global Synapse Settlement Model (SPEC-AI.5.2)

## Status: IMPLEMENTED

All edge functions updated to use `staged_health_data` (the real table). No references to non-existent `staged_data` remain.

## Economics

- **Credit Value**: $0.75 USD per Synapse credit
- **Revenue Share**: 30% of total value goes to contributor pool
- **Weighting**: `(quality + completeness) / 2` coefficient applied to base share
- **Clamp**: NONE — unlimited reward potential, data value is absolute

## Pipeline Flow

```
Health Data Ingested → raw_health_data
  → auto_process_raw_health_data (DB trigger) → staged_health_data
  → safe_reward_on_staged_health (DB trigger) → process-staged-data (orchestrator)
    → calculate-enhanced-rewards (pool math + weighting on staged_health_data)
    → credit-user-wallet (FBO → user_wallets.cash_balance)
```

## Key: User ID Resolution

`staged_health_data` uses `pseudo_user_id` (SHA-256 hash), not `user_id`.
The orchestrator resolves the real user via:
1. `raw_data_id` → `raw_health_data.user_id` (primary path)
2. `get_user_id_from_pseudonym(pseudo_user_id)` → `profiles` table (fallback)

## Files

| File | Role |
|------|------|
| `calculate-enhanced-rewards/index.ts` | Global Reward Engine: queries `staged_health_data`, $0.75 × 30% pool → weighted distribution |
| `credit-user-wallet/index.ts` | FBO Dissemination: credits `user_wallets.cash_balance` + `total_earned` |
| `process-staged-data/index.ts` | Orchestrator: reverse-lookups user_id, chains calculation → wallet credit |
| `anonymize-and-stage-data/index.ts` | Strava anonymizer: inserts into `staged_health_data` with `pseudo_user_id` |
| `comprehensive-apple-health-processor/index.ts` | Apple Health processor: inserts into `staged_health_data` |
