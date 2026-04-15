

# Fix: Apple Health Modal + Pipeline Column Mismatches + fiat_ledger Migration

## Problems Identified

### 1. `apple-health-sync` inserts nonexistent `step_count` column
Line 252 sets `healthRecord.step_count = parsed` but `raw_health_data` has no `step_count` column. Every step-count insert fails silently or crashes.

### 2. `pipeline-diagnostics` queries nonexistent `processing_started_at` column
Line 44 queries `processing_started_at` which doesn't exist on `raw_health_data`. This causes the diagnostics call (fired on every DataDashboard load) to error, visible in edge function logs.

### 3. Apple Health Modal never displays step data
The edge function response puts `value` inside `processed_data[].value` but the modal's `onHealthDataSyncComplete` callback (lines 96-98) first checks for top-level `serverResponse.steps` / `serverResponse.heartRate` / `serverResponse.calories` — which the edge function never sets. The fallback (lines 101-115) checks `processed_data` array items but these values are raw primitives that may not map correctly.

### 4. Apple Health Modal won't close
When not on the iOS native bridge (i.e. web preview), clicking "Connect" triggers `syncHealthDataViaNativeApp` which checks for `webkit.messageHandlers.syncHealthData`. If absent, it sets error state but the modal stays open — there's no close button on the error state, only a "Retry Connection" button.

### 5. Multiple DB functions reference `processing_started_at`
`trigger_idia_synapse_orchestration`, `process_backlog_data`, `process_stuck_raw_data`, `auto_process_raw_health_data`, `check_health_data_pipeline_status`, `recover_stuck_health_data`, `recover_all_stuck_health_data`, `get_all_user_health_data` — all reference `processing_started_at` and/or `step_count`. These need either the columns added or the functions updated.

## Fix Plan

### A. Database Migration — Add missing columns
Add `step_count` and `processing_started_at` columns to `raw_health_data` since many existing DB functions depend on them. This is safer than rewriting 10+ functions.

```sql
ALTER TABLE public.raw_health_data
  ADD COLUMN IF NOT EXISTS step_count integer,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
```

### B. Fix `pipeline-diagnostics` edge function
Remove the query for `processing_started_at` from the select statement (line 44), or keep it now that the column will exist.

Actually with the migration above, the column will exist, so this fixes itself.

### C. Fix `apple-health-sync` edge function
The `step_count` column will now exist, so the insert will work. Additionally, add top-level summary fields (`steps`, `heartRate`, `calories`) to the response JSON so the modal can display them:

```typescript
// After the processing loop, before the response:
let summarySteps = 0, summaryHeartRate = 0, summaryCalories = 0;
let hrCount = 0;
for (const item of processedData) {
  if (item.type === "steps") summarySteps += Number(item.value) || 0;
  if (item.type === "heartRate") { summaryHeartRate += Number(item.value) || 0; hrCount++; }
  if (item.type === "activeEnergyBurned") summaryCalories += Number(item.value) || 0;
}

// Include in response:
steps: summarySteps || undefined,
heartRate: hrCount > 0 ? Math.round(summaryHeartRate / hrCount) : undefined,
calories: summaryCalories || undefined,
```

### D. Fix Apple Health Modal close/error behavior
- Add a "Close" button alongside "Retry Connection" on the error state
- Ensure the `onClose` handler resets state so reopening works cleanly

```tsx
{connectionStatus === "error" && (
  <div className="space-y-2 py-4">
    <Button variant="outline" onClick={() => setConnectionStatus("idle")} className="w-full">
      Retry Connection
    </Button>
    <Button variant="ghost" onClick={onClose} className="w-full">
      Close
    </Button>
  </div>
)}
```

### E. Deploy `credit-cash-wallet` edge function
Already created in the codebase — just needs deployment.

## Files Modified

| Asset | Change |
|-------|--------|
| Database migration | Add `step_count` and `processing_started_at` columns to `raw_health_data` |
| `supabase/functions/apple-health-sync/index.ts` | Add summary fields to response JSON |
| `src/components/AppleHealthModal.tsx` | Add Close button to error state |
| `supabase/functions/credit-cash-wallet/index.ts` | Deploy (already written) |

