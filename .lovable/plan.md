# Fix Apple Health anchoring stall — edge function only

## Corrected read of the evidence

You were right about the table. `raw_health_data` is drained by its trigger, so it is empty by design. `staged_health_data` shows today's rows: 55 rows in the 14:00 UTC hour, latest 14:39:23, all `src_v: "Native-PureAlpha"` from an iPhone15,4, ACA `027fb9d8…`, status `staged`.

So the pipeline is working end to end: the shell reaches the function, the DELT check passes, records insert, the trigger stages them. **The data arrives; the response does not.** The spinner keeps turning because the function never returns a body the shell can hand to `onHealthDataSyncComplete`, and sometimes dies with a 500 first.

The reason is the tail of the handler. After inserting, it walks the payload in 100-row chunks, sequentially, and does a `select("id")` round trip per chunk purely to rebuild an echo array. Each inserted row also fires three triggers (`register_hub_data`, `fn_seat_aca_beacon`, `broadcast_protocol_pulse`) plus the staging path. On a full HealthKit firehose this blows the isolate's wall-clock/CPU budget before the `return` is reached — the writes have already committed, the client gets nothing.

All work stays in `supabase/functions/apple-health-sync/index.ts`. No React changes.

## Changes to the edge function

1. **Acknowledge before the heavy write.** Validate → verify DELT → upsert `data_connections` (`is_active: true`, `last_sync_at`) → return `200` immediately with `{success:true, accepted:<n>, request_id, delt_anchor}`. Perform the inserts afterward inside `EdgeRuntime.waitUntil`, so the isolate is allowed to finish them after the response is flushed. The connection upsert moving ahead of the inserts also lets the app's realtime/poll watcher on `data_connections` see the sync land.

2. **Delete the per-chunk `select("id")`.** The echo array is what makes the loop expensive and it is not needed by the caller. Insert with no returning payload, raise the chunk size, and run a bounded number of chunks concurrently rather than strictly serially.

3. **Never mask a crash.** Replace `req.json().catch(() => ({}))` with an explicit try/catch that logs and returns a 400 naming an oversized or malformed payload, and log `error.stack` in the top-level catch instead of just the message. This is what turns the current opaque 500 into a readable cause.

4. **Granular `[BEGIN]`/`[END]` telemetry**, matching the instrumentation style you supplied: request id, env verification, parse, extraction with resolved record count, DELT profile and ACA lookups (including their error objects), transformation count, connection upsert, and per-chunk begin/end with inserted counts and rejections.

5. **Always return JSON with CORS.** Every branch — 400, 403, 500, early exit — carries `success`, `error`, `request_id` and the CORS headers, so the shell's error callback fires instead of the UI hanging. Preflight gains `Access-Control-Allow-Methods` and `Max-Age`.

6. **Reachability probe.** `GET ?ping=1` returns `{ok:true, ts}` without touching the database, so a device can be tested directly and a gateway/network failure can be told apart from a payload failure.

7. **Report drops.** The response includes records received, accepted, and skipped by the whitelist, so an unmapped payload reads as `accepted: 0` instead of a silent success.

## Verification

- `POST` with no body, with a bad ACA hash, and with a valid metric payload against the live function; each must answer quickly with JSON.
- Confirm new rows appear in `staged_health_data` after the valid payload, proving background completion survives the early response.
- Re-read the function logs for the new `[BEGIN]/[END]` chain on a real device sync.

Note: `roadmap.md` cannot be created while in plan mode; this task will be recorded there when implementation starts.
