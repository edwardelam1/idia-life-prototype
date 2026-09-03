# Swift-Master Strict Handoff: Spec Compliance Check + Live Verification

The exact spec you pasted is already implemented in both files and the edge function is deployed. This plan verifies that compliance end-to-end and closes the one remaining gap: a live Swift-side confirmation that the egress fires.

## Current state (verified against your spec, line by line)

### 1. Frontend — `src/components/AppleHealthModal.tsx` ✅ Already matches
- The UI makes **zero** direct network calls to `apple-health-sync` (ping probe and query-string POST fallback were removed).
- Sync trigger posts `{ user_id, aca_hash_key, auth_token, sync_session_id: "manual_" + … }` to `window.webkit.messageHandlers.syncHealthData` with the exact `--- BEGIN/END ERROR HANDLING ---` wrapper and the `[FRONTEND_INIT]` / `[FRONTEND_SUCCESS]` log lines.
- Missing bridge → `[FRONTEND_FATAL]` lines, timers cleared, loading state released with "not running in native shell" error.
- `window.onHealthDataSyncComplete(result)` and `window.onHealthDataSyncError(errorMsg, sessionId)` are wired with the exact `[FRONTEND_CALLBACK_SUCCESS]` / `[FRONTEND_CALLBACK_ERROR]` Planck log lines (including the `Processed: <count>` message), gated on the current `sync_session_id`, releasing the spinner and rendering success/error UI.
- One deliberate addition: a 75s watchdog that releases the spinner with "Native shell did not respond" if neither Swift callback fires — this is what prevents a *silent* stall if the Swift handler itself never calls back. The callbacks remain the primary path; the watchdog only fires on total Swift silence.

### 2. Edge Function — `supabase/functions/apple-health-sync/index.ts` ✅ Already matches (deployed)
- No `GET ?ping=1` handler — it was deleted.
- `OPTIONS` preflight → 200 (kept because the Android/web caller is a browser origin).
- Any non-POST method → `[EDGE_METHOD_FATAL]` + **405** (verified live: `GET ?ping=1` now returns 405).
- Missing `aca_hash_key` or data payload → `[EDGE_PAYLOAD_FATAL]` + **400** (verified live: `POST {}` returns 400).
- `[EDGE_INIT]` / `[EDGE_PROCESS]` / `[EDGE_SUCCESS]` / `[EDGE_CATCH_FATAL]` logs with the BEGIN/END delimiter lines on every branch.
- On successful ingestion it always returns **200 `{ success: true, processed_count, sync_session_id, … }`** so Swift's `evaluateSyncSuccess` fires; exceptions return **500**.
- Compatibility (from the approved plan): the data-payload check accepts `data` **or** `healthData`, because two non-Swift callers also POST here — `src/services/healthService.ts` (Android Health Connect) and the `daily-apple-health-sync` pg_cron job — and both send `healthData`. Swift's exact `data` payload is accepted unchanged.
- DELT/ACA verification, HealthKit key mapping, chunked `raw_health_data` inserts, and the `data_connections` stamp are preserved per the plan ("execute database insert logic here").

## What remains: live verification

1. Confirm the deployed revision matches the file above (redeploy only if the deployed copy drifted).
2. Trigger one real sync from the iOS shell and read the edge-function logs for the full `[EDGE_INIT] → [EDGE_PROCESS] → [EDGE_SUCCESS]` chain and the matching `[FRONTEND_CALLBACK_SUCCESS]` in the webview console.
3. Confirm a `raw_health_data` insert and a `data_connections` row stamped `apple_health / healthy`.

## Technical details

- No code changes expected — this is a verification pass. If any log line in step 2 is missing, the fix is scoped to whichever side (Swift bridge or edge) went silent, guided by the Planck logs.
- CORS headers stay on every response including 405/400/500.
- No database migration required.
