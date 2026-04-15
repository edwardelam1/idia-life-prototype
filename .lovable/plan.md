

# Fix: Remove Blocking DB Upsert from `onHealthDataSyncComplete`

## Problem

The frontend `onHealthDataSyncComplete` handler awaits a Supabase upsert to `data_connections` before updating the UI state and firing the close timer. If that DB call hangs or fails, the modal locks on "Connecting..." forever. The edge function already handles connection logging server-side, so this call is redundant.

## Changes

**File: `src/components/AppleHealthModal.tsx`**

Replace the entire `onHealthDataSyncComplete` handler (lines 78-130) with the user's provided block:

- Remove the `await supabase.from("data_connections").upsert(...)` block (lines 81-92)
- Replace the old data-parsing logic with proper aggregation (summing steps/calories, averaging heart rate, guarding against `NaN`)
- Set `connectionStatus` and `isConnecting` immediately at the top (before parsing) so the UI unlocks instantly
- Add a new `justFinishedSync` state variable (needs to be declared near other state declarations)
- Swap `onClose()` before `onComplete()` in the timeout so the modal disappears before the dashboard refreshes
- Wrap both callbacks in try/catch for resilience

**State addition** (~line 53 area): `const [justFinishedSync, setJustFinishedSync] = useState(false);`

No other files affected.

