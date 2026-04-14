
# Global Synapse Settlement Model (SPEC-AI.5.2)

## Status: IMPLEMENTED

Three edge functions rewritten to implement the universal settlement engine.

## Economics

- **Credit Value**: $0.75 USD per Synapse credit
- **Revenue Share**: 30% of total value goes to contributor pool
- **Weighting**: `(quality + completeness) / 2` coefficient applied to base share
- **Clamp**: min $0.05, max $1.00 per settlement

## Pipeline Flow

```
Synapse Credit Consumed
  → process-staged-data (orchestrator)
    → calculate-enhanced-rewards (pool math + weighting)
    → credit-user-wallet (FBO → user_wallets.cash_balance)
```

## Files

| File | Role |
|------|------|
| `calculate-enhanced-rewards/index.ts` | Global Reward Engine: $0.75 × 30% pool → weighted distribution |
| `credit-user-wallet/index.ts` | FBO Dissemination: credits `user_wallets.cash_balance` + `total_earned` |
| `process-staged-data/index.ts` | Orchestrator: chains calculation → wallet credit |
