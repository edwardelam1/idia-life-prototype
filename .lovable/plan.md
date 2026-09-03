# Apple Health: the iOS shell never reaches the server

## What the evidence actually shows (verified this turn)

- Three consent/biometric anchors were written for your account at 13:21:47, 13:22:48 and 13:24:21 UTC (`user_aca_records`, source `apple_health`). The modal, ACA stage and Face ID all completed three times.
- `apple-health-sync` has **zero** invocations in that window — empty log stream, no analytics rows in 6 hours.
- A direct server-side call to the deployed function answers correctly (HTTP 400 `Missing required field: aca_hash_key`), so the function is deployed, healthy and reachable.
- Your account has **no** `apple_health` row in `data_connections` at all (only a 2025 Strava row), and **zero** rows ever in `raw_health_data`.
- The 200 you captured is the modal's own polling read of `data_connections`; it returns an empty result correctly, because nothing was ever written.

Conclusion: after Face ID succeeds, JS posts `syncHealthData` to the native shell and the shell never makes the HTTP request, never calls `onHealthDataSyncError`, and the modal spins until the watchdog fires.

## Approach (as you outlined — React drives the handshake, Swift untouched)

1. **React-driven server handshake**
   - After the ACA record is written, the modal calls `apple-health-sync` itself with the ACA hash and an empty sample array, before delegating to the shell.
   - This guarantees the function is invoked and the `apple_health` connection row exists, so the UI can resolve independently of the shell.
   - The call goes through `supabase.functions.invoke` (correct auth + CORS handling) rather than a bare `fetch` to a hardcoded host.

2. **Strict 15-second shell watchdog**
   - After `postMessage`, a 15s timer fires "The iOS app never returned HealthKit data — no upload was attempted." with Retry, replacing the 60s catch-all that blamed the server.
   - Separate stage labels: `handshake` ("Testing server reachability…") and `shell_sync` ("Awaiting iOS HealthKit extraction…").
   - Existing ledger/Realtime confirmation stays as the success path when the shell does deliver.

3. **Payload for the shell**
   - Send `action: "fetch_health_samples"` plus the legacy `comprehensive_health_sync` fields and `config` block in the same message, so older shell builds still parse it.

4. **Granular `[BEGIN]/[PROGRESS]/[ERROR]/[END]` logging** on both sides, as in your draft — no tokens, ACA hashes or raw HealthKit values in the logs.

## Corrections to the pasted code (must be applied)

- **Column names.** `raw_health_data` has no `data_type`, `value`, `start_date`, `end_date` or `source_device` columns. Inserts must use the real shape: `user_id`, `aca_hash_key`, `device_type`, `raw_payload` (jsonb), `recorded_at`, `processing_status`, `processed`, `step_count`. The pasted insert would fail on every sample. The existing normalization and HealthKit key mapping in the current function stays.
- **No upsert.** Per your earlier instruction, keep the explicit read-then-insert-or-update on `data_connections` instead of `upsert(..., { onConflict })`.
- **Keep DELT verification.** The pasted version drops the `platform_guid` match against `profiles`; the ACA hash alone is not sufficient. Keep the profile → `platform_guid` → `user_aca_records` check.
- **Keep the existing modal UI.** The pasted component's JSX is truncated and drops the data-type selection, connected/disconnect states and the icon ref. Apply the state machine, handshake and watchdog into the current file rather than replacing it.

## Verification

- `apple-health-sync` shows one invocation per attempt in the function logs (currently zero).
- An `apple_health` row exists for the account with a fresh `last_sync_at` right after pressing Connect.
- The modal never spins past ~15s and always ends in Connected or a stage-specific error with Retry.
- `raw_health_data` rows appear once the shell returns samples; until then the UI says the shell stalled, not that Apple settings are wrong.
