# Fix Apple Health Disconnect / Reconnect State Teardown

Swift is out of scope and will not be touched.

## What the data proves

- Your device successfully delivered health data earlier today: 128 rows at 12:38 UTC and 16 rows at 13:08 UTC, each under its own consent hash. The native shell therefore posts correctly.
- Since then, every connect attempt mints a **new consent record** but **no health payload follows** any of them.
- Your profile has **zero `apple_health` rows in `data_connections`** — so even the modal's realtime/poll safety net has nothing to observe, and it spins forever.
- The web layer currently tells the device to fetch **an empty set of data types**: the modal keeps a `selectedDataTypes` set with all 16 HealthKit identifiers checked, but the bridge message sends `requestedDataTypes: {}`. Nothing is requested, so nothing is gathered and nothing is posted.

## Fix

### 1. Send the real requested types (React)
In the Apple Health modal, build the requested-types payload from the user's actual selections instead of an empty object, and send it in the shape the native shell has always consumed: a map keyed by HealthKit identifier with a boolean value, alongside an array of the same identifiers for tolerance. Block the dispatch with a clear message if the user has deselected everything.

### 2. Stop minting a throwaway consent record per tap (React + DB)
Reuse the existing active `apple_health` consent artifact for this platform identity when one is present, and only mint a new one when none exists. This keeps the consent ledger clean and guarantees the hash sent to the device is the same one already anchored in the database.

### 3. Make the modal recover on its own (React)
- Seed the `apple_health` row in `data_connections` (inactive, no sync stamp) at the start of a connect attempt so the realtime subscription and poll fallback have a row to watch; the sync itself flips it active.
- Give the connect flow a bounded wait with an explicit, readable failure state instead of an endless spinner.

### 4. Clean disconnect teardown (React)
Replace the current minimal disconnect handler with a complete teardown that:
- Sets a brief "connecting" state during teardown so the UI does not feel stuck.
- Updates **all** `apple_health` rows for the current user to `is_active: false` by filtering on `user_id` + `connection_type`, rather than only the single `existingConnection.id` that may be stale or cached.
- Removes any local session flag (`localStorage.removeItem("apple_health_connected")`) so a fresh launch cannot resurrect the old state.
- Calls `onDisconnect?.()` and then `closeAndReset()` to kill active polling intervals, Supabase realtime channels, and stale `syncSessionIdRef` values.
- Logs `[BEGIN: React.HandleDisconnect]` / `[END: React.HandleDisconnect]` and surfaces a readable error if the teardown throws.

This prevents the app from falsely showing "connected" on fresh launches and removes the leftover background listeners that currently lock the state machine into a silent rejection on reconnect.

### 5. Confirm with hardware only
No synthetic requests, pings, or fabricated payloads. Verification is one full cycle from your iPhone:
1. Tap **Connect Apple Health** — expect the modal to request biometrics, seed the connection row, and begin the hardware handshake.
2. After a successful sync, tap **Disconnect** — expect the connection row to flip inactive and the modal to close cleanly.
3. Immediately tap **Connect Apple Health** again without restarting the app — expect a fresh session, a reused consent hash, and a successful second sync.

## Technical notes

- Files touched: `src/components/AppleHealthModal.tsx` only, plus a data write to seed/repair the `data_connections` row for the affected profile.
- The edge function stays as-is; its logs show it responds correctly whenever it is actually called.
- No schema changes and no Swift changes.
