# Fix Apple Health and FordConnect connection failures

Both flows complete the biometric (ACA) step and then stall. They fail for different reasons after that point.

## 1. Apple Health — endless spinner

What the code does today after Face ID succeeds:
- writes the consent record, then posts `syncHealthData` to the iOS shell
- waits for the shell to call back `onHealthDataSyncComplete` / `onHealthDataSyncError`
- a backup watcher polls `data_connections` and listens on Realtime for an active `apple_health` row

Confirmed problems in the code:
- `bridgeTimeoutRef` is declared and cleared but **never armed** — if the shell never calls back (HealthKit permission sheet dismissed, request failed, HTTP error swallowed natively), the modal spins forever with no error and no exit.
- The success watcher only accepts `data_connections.is_active === true`. If `apple-health-sync` rejects the request (it returns 403 when no matching consent record is found), nothing is ever stamped, so neither the callback nor the watcher fires.

Fix:
- Arm a bridge watchdog (60s) that stops the spinner and shows an actionable error with the last known stage, instead of hanging.
- Add stage-level status text ("Consent anchored", "Requesting HealthKit data", "Awaiting ingestion") so a stall is visible where it happens.
- Broaden the success watcher: also treat a fresh `raw_health_data` row (created after the sync started) as success, not only the `data_connections` flag.
- Surface the real reason on failure: if the native callback returns an error, or the watchdog trips, show the message and a Retry button.

Before writing the fix, verify the actual stall point by inspecting the backend for the affected account: whether a `user_aca_records` row exists for `apple_health`, whether `data_connections` has an `apple_health` row, whether any `raw_health_data` arrived, and what `apple-health-sync` logged (403 consent-verification failures vs. no invocation at all). If the function was never invoked, the stall is in the shell; if it returned 403, the consent record shape is the cause and the fix moves to how the consent record is written/matched.

## 2. FordConnect — white screen

The Ford flow opens a popup window with `window.open("about:blank", ...)`, writes placeholder HTML into it, then redirects it to Ford's login. Inside the iOS WKWebView shell this is exactly what produces a white screen: the popup either has no navigation delegate to load into, or opens a blank child web view that cannot follow the cross-origin Ford redirect. It also relies on `popup.closed` polling and on Ford's callback page calling `window.close()`, neither of which work in the shell.

Fix:
- Detect the native shell and stop using `window.open` there. Hand the Ford OAuth URL to the native shell to open in the system browser (the shell already exposes an external-open bridge used for the IDIA Hub); on plain web keep the popup path as-is.
- Replace close-detection with connection polling: while the modal is open, poll `data_connections` for an active `ford` row every few seconds (and on app foreground / visibility change), so the flow completes when the user returns to the app regardless of how the browser window ended.
- Make the Ford callback page end on a deep link back into the app instead of `window.close()`, so returning is automatic.
- Add an explicit timeout with a clear error rather than a silent blank state, and log the failing step.

Note: if the shell's external-open bridge only accepts the Hub URL (no arbitrary `url` payload), the iOS shell needs a one-line change to accept a `url` field. The plan includes a graceful in-app fallback until that ships, and the exact shell change will be spelled out.

## Technical notes

Files expected to change:
- `src/components/AppleHealthModal.tsx` — watchdog timer, stage status, broader success detection, retry.
- `src/components/FordConnectionModal.tsx` — native-shell branch for opening OAuth, polling-based completion, timeout/error handling.
- `supabase/functions/ford-oauth-callback/index.ts` — redirect to the app deep link on success instead of `window.close()`.

Diagnostics (read-only) run first: Supabase queries against `user_aca_records`, `data_connections`, `raw_health_data`, plus `apple-health-sync` and `ford-auth-url` function logs.
