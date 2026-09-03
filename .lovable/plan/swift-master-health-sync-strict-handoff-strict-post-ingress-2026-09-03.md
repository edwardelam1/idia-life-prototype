# Swift-Master Health Sync: Strict Handoff + Strict POST Ingress

Make the iOS Swift shell the sole owner of the Apple Health egress. The web UI only hands the config to the native bridge and waits for Swift's callbacks; the Edge Function only accepts the exact POST payload Swift sends, with loud Planck-style logging on every branch so nothing can stall silently.

## 1. Frontend: `src/components/AppleHealthModal.tsx`

- Replace the sync trigger with the exact `triggerNativeHealthSync(config)` block: post `{ user_id, aca_hash_key, auth_token, sync_session_id }` to `window.webkit.messageHandlers.syncHealthData`, log `[FRONTEND_INIT]` / `[FRONTEND_SUCCESS]`, and on a missing bridge log `[FRONTEND_FATAL]` and immediately release the loading state with a clear "not running in native shell" error.
- Remove every direct network call the UI makes to `apple-health-sync` (the `?ping=1` reachability probe and the query-string POST fallback at line 290). The UI never talks to the endpoint again.
- Remove the Realtime + 3.5s polling "hybrid safety net" that watches `data_connections` / `staged_health_data`. Sync completion is decided only by Swift's callbacks.
- Wire `window.onHealthDataSyncComplete(result)` and `window.onHealthDataSyncError(errorMsg, sessionId)` exactly as specified (with the Planck log lines), gated on the current `sync_session_id`, releasing the loading state and rendering success (using `result.processed_count`) or error.
- Keep the ACA generation step before the handoff (DELT requires the anchor) and keep a hard watchdog that releases the spinner and shows "Native shell did not respond" if neither callback fires — otherwise a silent Swift failure re-creates the stall the user is reporting.

## 2. Edge Function: `supabase/functions/apple-health-sync/index.ts`

Harden to strict POST while preserving the pipeline:

- Delete the `GET ?ping=1` handler entirely.
- Any method other than `POST` (and the `OPTIONS` preflight, which must stay for the browser/Android caller) → log `[EDGE_METHOD_FATAL]` and return `405`.
- Require `aca_hash_key` and `data` on the parsed body; missing either → log `[EDGE_PAYLOAD_FATAL]` and return `400`.
- Keep the existing DELT/ACA verification, the HealthKit key mapping, `raw_health_data` chunked inserts and the `data_connections` stamp — that is the "execute database insert logic here" step.
- Wrap in the specified try/catch: log `[EDGE_INIT]`, `[EDGE_PROCESS]`, `[EDGE_SUCCESS]`, `[EDGE_CATCH_FATAL]` with the exact BEGIN/END delimiter lines, and always return `200 {"success":true,...}` on ingestion so Swift's `evaluateSyncSuccess` fires, or `500` on exception.

## Compatibility note

Two non-Swift callers also POST to this endpoint: `src/services/healthService.ts` (Android Health Connect, via `supabase.functions.invoke`) and the `daily-apple-health-sync` pg_cron job. Both send POST + JSON, so strict POST does not break them, but they send `healthData` rather than `data`. The required-field check will accept either key name so the Android pipeline keeps working; everything else follows the specified contract.

## Technical details

- Files touched: `src/components/AppleHealthModal.tsx`, `supabase/functions/apple-health-sync/index.ts`.
- CORS headers stay on every response (including 405/400/500) — the Android/web caller is a browser origin and would otherwise see opaque failures.
- No database migration required.
