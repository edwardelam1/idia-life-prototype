# Apple Health: the iOS shell never reaches the server

## What the evidence actually shows (verified this turn)

- Three consent/biometric anchors were written for your account at 13:21:47, 13:22:48 and 13:24:21 UTC (`user_aca_records`, source `apple_health`). So the modal, the ACA stage and Face ID all completed three times.
- `apple-health-sync` has **zero** invocations in that window. The edge-function log stream for it is empty, and no analytics rows exist for it in the last 6 hours.
- A direct server-side call to the deployed function answers correctly (HTTP 400 `Missing required field: aca_hash_key`), so the function is deployed, healthy and reachable.
- Your account has **no** `apple_health` row in `data_connections` at all (only a 2025 Strava row), and **zero** rows ever in `raw_health_data`.
- The 200 response you captured is the modal's own polling read of `data_connections`. It returns 200 with an empty result, correctly, because nothing was ever written.

Conclusion: after Face ID succeeds, the JS posts `syncHealthData` to the native shell and the shell never makes the HTTP request. Nothing on the server side is failing because the server is never called. The shell also never calls `onHealthDataSyncError`, so the modal spins until the 60s watchdog fires with the "server never confirmed a saved sync" message — which is accurate but useless.

## What to change

The web app must stop delegating the upload to the shell, because the shell's upload is unverifiable and currently silent.

1. **Move the HTTP call into the web app**
   - Ask the shell only for HealthKit samples: post `action: "fetch_health_samples"` (keeping the legacy `comprehensive_health_sync` payload in the same message for older builds) and accept samples through a JS callback.
   - When samples arrive, the web app itself calls `apple-health-sync` via `supabase.functions.invoke`. The real HTTP status, body and error then belong to the app instead of the shell, and the function is guaranteed to be invoked.
   - Keep the legacy path alive: if the shell instead performs its own upload and fires `onHealthDataSyncComplete`, that still resolves the session.

2. **Prove reachability before blaming anything**
   - Immediately after the ACA anchor is written, the web app calls `apple-health-sync` once with a handshake-only payload (ACA hash, no samples). The function already handles the "anchored, zero samples" case and writes the `data_connections` row.
   - This guarantees an `apple_health` connection row exists and gives a definitive signal in the UI: if the handshake succeeds and the sample step then fails, the failure is provably the iOS shell, not the server.

3. **Split the watchdogs so the message names the real stage**
   - Short shell watchdog (about 15s): "The iOS app never returned HealthKit data — no upload was attempted." Show Retry.
   - Upload watchdog only after samples are in hand, reporting the actual invoke error text.
   - Remove the current single 60s catch-all message.

4. **Diagnostics that survive to the server**
   - Send the sync session id in the handshake so each attempt is visible in the function logs, with sample count and write outcome only — no health values, tokens or raw payloads.

## Native shell note

If the current iOS build has no handler that returns HealthKit samples to JS, step 1's sample path will no-op and the modal will show the shell watchdog message instead of spinning. Steps 2–4 still land the connection row and give an honest UI. Handing samples back to JS needs one Swift-side handler; the web side will be ready for it.

## Verification

- Confirm `apple-health-sync` shows an invocation per attempt in the function logs (currently zero).
- Confirm a `data_connections` row of type `apple_health` exists for the account with a fresh `last_sync_at`.
- Confirm the modal never spins past ~15s and always ends in Connected or a stage-specific error with Retry.
- Confirm `raw_health_data` rows appear once the shell returns samples.
