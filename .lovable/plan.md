

## Plan: Fix Apple Health Modal Data Display + Identity Verification

### Problem Summary

Three independent issues are causing the Apple Health Modal to show dashes ("—") on a fresh test account:

1. **Key mismatch**: `AppleHealthModal.tsx` checks for UI-side strings that don't match the normalized keys returned by `apple-health-sync` (which uses `healthKitKeyMapping`).
2. **Identity drift risk**: New accounts may hit `apple-health-sync` before `profiles.platform_guid` is verified to equal `user_id`, triggering a 403 "DELT Protocol Verification Failed".
3. **Edge function logs show schema bugs** in `apple-health-sync` itself (numeric column receiving strings like `"iPhone"`, `net.http_post` signature mismatch) — but those are separate downstream bugs and out of scope for this fix.

### Investigation Notes

- `AppleHealthModal.tsx` `syncCompleteHandler` aggregates `processed_data[].type` against UI strings.
- `apple-health-sync/index.ts` emits records with `type` set to mapped keys: `steps`, `heartRate`, `activeEnergyBurned`, `sleepHours`, `calories`.
- Identity migration already ran (`enforce_platform_guid_equals_user_id` trigger + backfill), so existing rows are healed. Only risk is a brand-new signup whose `handle_new_user_genesis()` insert raced ahead of the modal — defensive heal in `Onboarding.tsx` already covers this.

### Changes

**1. `src/components/AppleHealthModal.tsx` — align aggregation keys with server**

In `syncCompleteHandler`, update the `processed_data.forEach` block so the `item.type` checks match the exact normalized keys emitted by `apple-health-sync`:

- `steps` → totalSteps
- `heartRate` → hrValues
- `activeEnergyBurned` → totalCalories (also accept `calories` as fallback for older payloads)
- `sleepHours` → sleepHours (if displayed)

Keep the existing fallback `Number(item.value)` parse + NaN guard.

**2. Defensive identity check before native bridge call**

In `handleConnect` (before generating the ACA hash and calling `syncHealthDataViaNativeApp`), add a one-line defensive upsert to guarantee `profiles.platform_guid === user.id` for the current session. This prevents the 403 on accounts where the `handle_new_user_genesis` trigger hasn't fully settled:

```typescript
await supabase.from('profiles')
  .update({ platform_guid: session.user.id })
  .eq('user_id', session.user.id);
```

This is a no-op when the trigger already enforced identity, and a heal when it didn't.

### Out of Scope (Separate Bugs)

The edge function logs reveal `apple-health-sync` itself has broken inserts (`numeric` columns receiving strings, `net.http_post` signature errors). These are downstream of the modal fix and require a separate pass on the edge function — not part of this change.

### Files Modified

| File | Change |
|------|--------|
| `src/components/AppleHealthModal.tsx` | Align `processed_data` key matching with server's `healthKitKeyMapping`; add defensive `platform_guid` heal before bridge call |

