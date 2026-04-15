

# Fix: Apple Health Key Mismatch + Primitive Value Extraction + NaN Pipeline Crash

## Root Cause (3 interlocking bugs)

1. **Key mismatch (silent skip)**: iOS bridge sends data keyed by Apple HealthKit identifiers (e.g. `HKQuantityTypeIdentifierStepCount`), but `apple-health-sync` only loops over internal keys (`steps`, `heartRate`). No keys match → nothing inserted → triggers never fire.

2. **Primitive value extraction**: When data arrives as a raw number (e.g. `5000`) instead of `{value: 5000}`, `record.value` is `undefined` → frontend displays `--`.

3. **NaN crash in comprehensive-apple-health-processor**: `parseInt(undefined)` → `NaN` → PostgreSQL rejects the insert → pipeline dies silently.

## Changes

### 1. `supabase/functions/apple-health-sync/index.ts`
- Add a `keyMapping` dictionary that maps all Apple HealthKit identifier strings to the internal keys the function already expects
- Normalize incoming payload keys before the processing loop
- Fix value extraction: use `record.value !== undefined ? record.value : record` so primitives are handled
- Return `actualValue` in `processed_data` array so frontend gets real numbers

### 2. `supabase/functions/comprehensive-apple-health-processor/index.ts`
- In `mapAppleHealthDataToColumns`: wrap `record` so it's always an object with a `.value` property
- Change all `record.value` checks to use the safe wrapper, preventing `parseInt(undefined)` → `NaN`

### 3. Deploy both functions

No database migration needed. No UI changes needed — the frontend already reads `processed_data[].value` correctly, it just never received a value.

## Technical detail

Key mapping (added to apple-health-sync):
```typescript
const keyMapping: Record<string, string> = {
  "HKQuantityTypeIdentifierStepCount": "steps",
  "HKQuantityTypeIdentifierDistanceWalkingRunning": "distanceWalkingRunning",
  "HKQuantityTypeIdentifierHeartRate": "heartRate",
  "HKQuantityTypeIdentifierActiveEnergyBurned": "activeEnergyBurned",
  // ... all 18 Apple HealthKit identifiers from the frontend
};
```

Safe value extraction (both functions):
```typescript
const actualValue = record.value !== undefined ? record.value : record;
```

Safe record wrapping (comprehensive processor):
```typescript
const record = (typeof originalRecord === 'object' && originalRecord !== null)
  ? originalRecord
  : { value: originalRecord };
```

