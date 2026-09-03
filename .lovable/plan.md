# Fix the manual Apple Health connection flow

## Confirmed diagnosis

The failure is after biometric verification, not in Apple Health permissions:

- The latest attempt created a fresh Apple Health ACA record at `2026-09-03 13:11:10 UTC`, confirming the biometric/consent stage completed.
- At `13:08:49–13:08:51 UTC`, the native shell reached `apple-health-sync` 23 times. Every request passed DELT verification and returned HTTP 200.
- Despite those successful responses, no `apple_health` connection row, `raw_health_data` row, or downstream `synapse_controller` row exists for that user.
- The edge function currently ignores the result of the `data_connections` upsert, catches and suppresses health-row insert failures, and still returns `success: true`. This creates a false-success response while nothing was saved.
- The modal does not require proof that a row was committed before treating the native callback as success. If no usable callback arrives, it waits 60 seconds and displays an incorrect message blaming Apple settings.
- Separately, the biometric promise has no timeout. That is not what happened in the logged attempt, but it is another path that can leave the same modal spinning indefinitely.

## Implementation

1. **Make edge-function persistence authoritative**
   - Validate the authenticated user against the submitted `user_id`.
   - Check and return errors from the `data_connections` upsert instead of discarding them.
   - Normalize each native HealthKit request shape, including single-sample payloads, before building records.
   - Treat zero recognized samples as a clear non-success result rather than reporting a completed sync.
   - Stop suppressing batch insert errors; return a non-2xx response with a safe, specific error.
   - Return success only after either health records are committed or an explicitly valid no-new-data connection anchor is committed.

2. **Make the modal follow the real server result**
   - Keep the connection manual: the user presses Connect, passes the biometric challenge, and the app performs that one requested sync.
   - Accept native completion only when it reports a successful server response for the current sync session.
   - Use a newly committed `data_connections.last_sync_at` or fresh health-ingestion signal as the backup completion condition.
   - Remove the fabricated processed count and the synthetic “Verified” data.
   - Replace the Apple-settings timeout message with the actual bridge/server failure returned by the pipeline.

3. **Eliminate indefinite spinner paths**
   - Add a bounded biometric callback timeout with listener cleanup.
   - Start separate timeouts for biometric verification and server upload so the UI identifies the stage that failed.
   - Always reset `isConnecting` and expose Retry after a rejected callback, malformed response, HTTP error, or timeout.

4. **Add focused diagnostics without health values or PII**
   - Log one sync/session identifier, recognized sample count, connection-upsert outcome, insert outcome, and final response status.
   - Avoid logging tokens, ACA hashes, or raw HealthKit payloads.

## Verification

- Exercise the modal manually in the iOS WKWebView and pass Face ID.
- Confirm exactly one manual sync session resolves without an indefinite spinner.
- Confirm `data_connections.apple_health` is active with a fresh `last_sync_at`.
- Confirm the submitted HealthKit samples reach the ingestion/downstream pipeline.
- Confirm malformed or rejected server writes return a visible Retry state with the real error and never blame unchanged Apple settings.
- Confirm the function no longer returns HTTP 200 when persistence fails.
