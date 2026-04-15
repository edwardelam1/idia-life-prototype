

# Plan: Database Cleanup + Consolidated Synapse Pipeline

## Current Problems

1. **Build error**: `AppleHealthModal.tsx` line 167-179 has a malformed `postMessage` block — extra `});` causes a syntax error.

2. **Duplicate triggers on `raw_health_data`**: Every insert fires TWO competing AFTER INSERT triggers:
   - `tr_raw_health_to_anonymizer` → calls `anonymization-processor` directly
   - `trigger_auto_process_health_data` → calls `idia-synapse` → which also calls `anonymization-processor`
   
   This doubles processing and wastes resources.

3. **Obsolete DB functions**: `auto_process_raw_health_data()`, `trigger_idia_synapse_orchestration()`, `trigger_health_data_processing()`, `trigger_anonymization_processor()` are all dead code — not attached to any active trigger or superseded by the ones that are.

4. **`idia-synapse` is orchestration-only**: It currently just passes data to `anonymization-processor`. The user wants it to handle ingestion + staging + reward fan-out directly (the "Dual-Mode" router).

5. **Schema mismatch in proposed code**: The user's suggested `idia-synapse` references `entity_id` and `payload` columns that don't exist. `raw_health_data` uses `user_id`; `staged_health_data` uses `pseudo_user_id` + typed columns (not a generic `payload` JSONB).

## Changes

### 1. Fix build error in `AppleHealthModal.tsx`
Remove the stray `});` and fix indentation of the `postMessage` call (lines 167-179). Point the endpoint to `idia-synapse` instead of `health-data-bridge` so the iOS bridge calls the consolidated router.

### 2. Database migration: Drop redundant triggers + dead functions
- **DROP TRIGGER** `tr_raw_health_to_anonymizer` (duplicates work)
- **DROP FUNCTION** `fn_call_anonymizer()` (no longer needed)
- **DROP FUNCTION** `auto_process_raw_health_data()` (dead code, references work done by safe_health_processing_trigger)
- **DROP FUNCTION** `trigger_idia_synapse_orchestration()` (dead code)
- **DROP FUNCTION** `trigger_health_data_processing()` (dead code)
- **DROP FUNCTION** `trigger_anonymization_processor()` (dead code, uses placeholder key)
- Keep `safe_health_processing_trigger()` as the single AFTER INSERT trigger → calls `idia-synapse`

### 3. Rewrite `idia-synapse/index.ts` as Dual-Mode Router
Supports two modes using **real schema columns**:

**Mode A (DB trigger)**: Receives `{raw_data_id, orchestration_mode: true}` → fetches raw record → generates `pseudo_user_id` via `generate_pseudonym()` RPC → inserts into `staged_health_data` with proper typed columns (`steps_count`, `average_heartrate`, etc.) → invokes `process-staged-data` for reward settlement → marks raw record as processed.

**Mode B (Direct app ingestion)**: Receives health data + auth token from iOS bridge → resolves user from JWT → verifies ACA hash → inserts into `raw_health_data` (which triggers Mode A via the DB trigger) → returns processed data summary to frontend.

Key differences from user's proposal — adapted to actual schema:
- Uses `user_id` not `entity_id` on `raw_health_data`
- Uses `pseudo_user_id` + typed columns on `staged_health_data`, not `entity_id` + `payload`
- Includes HealthKit key normalization (reuses mapping from `apple-health-sync`)
- Includes ACA/DELT verification for Mode B

### 4. Update `AppleHealthModal.tsx` endpoint
Point the native bridge to `idia-synapse` instead of `health-data-bridge`.

### 5. Deploy updated edge function

## Files Modified

| Asset | Change |
|-------|--------|
| `src/components/AppleHealthModal.tsx` | Fix syntax error, point to `idia-synapse` |
| `supabase/functions/idia-synapse/index.ts` | Full rewrite as dual-mode router |
| Database migration | Drop redundant triggers and dead functions |

