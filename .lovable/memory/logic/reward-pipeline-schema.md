---
name: Reward Pipeline Schema
description: Consolidated pipeline from raw ingestion through staging to reward settlement via idia-synapse dual-mode router
type: feature
---

## Pipeline Flow (Sovereign Tier)

| Stage | Component | Action |
|-------|-----------|--------|
| 1. Entry | iOS Native App | Calls `idia-synapse` (Mode B) with HealthKit JSON + Auth Token |
| 2. Anchor | idia-synapse | Resolves `user_id` from JWT, verifies ACA hash |
| 3. Ingest | idia-synapse | Inserts into `raw_health_data` with `processing_status: 'pending'` |
| 4. Trigger | `safe_health_processing_trigger` | AFTER INSERT fires → calls idia-synapse Mode A |
| 5. Stage | idia-synapse (Mode A) | Transforms raw → `staged_health_data` with typed columns + `pseudo_user_id` |
| 6. Reward | `process-staged-data` | Calculates reward, invokes `credit-cash-wallet` |

## Key Details

- **Single trigger** on `raw_health_data`: `safe_health_processing_trigger` → calls `idia-synapse` Mode A
- **HealthKit key normalization**: Maps Apple identifiers (e.g. `HKQuantityTypeIdentifierStepCount`) to internal keys (`steps`)
- **Value extraction**: Handles primitive values, objects with `.value`, and arrays (sum for cumulative, average for rates)
- **No mock data**: `reject_simulated_data()` BEFORE INSERT trigger enforces this
- **Redundant triggers removed**: `tr_raw_health_to_anonymizer`, `trigger_auto_process_health_data` dropped
- **Dead functions removed**: `fn_call_anonymizer`, `auto_process_raw_health_data`, `trigger_idia_synapse_orchestration`, `trigger_health_data_processing`, `trigger_anonymization_processor`
