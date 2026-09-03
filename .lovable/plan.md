# Fix Apple Health anchoring stall — server side only

## What the evidence shows

Checked the staged table (raw rows are drained by the pipeline, so an empty `raw_health_data` proves nothing):

- `staged_health_data` has real rows today — 73 in the 11:00 hour, 55 at 12:00, 16 at 13:00, the last at **13:08:49** (steps 124, walking speed, step length, asymmetry, double support) for user `217c6224…`.
- Nothing has landed since 13:08, yet that same user minted **six new Apple Health consent anchors** between 13:11 and 14:01 — each a spinner attempt that produced no data.
- Every one of those anchors carries a `platform_guid` that matches the user's profile, so the DELT check inside the function would pass.
- `apple-health-sync` is up and reachable: `OPTIONS` returns 200 with CORS headers, `POST {}` returns a clean 400 "Missing required field: user_id". Its logs show no request lines during the stalled attempts.

So consent anchoring succeeds and the pipeline works when a payload lands, but the recent syncs never produce a response the shell can act on — the spinner has nothing to resolve it. The 13:08 batch also shows the same metric repeated dozens of times, i.e. a large firehose inserted chunk-by-chunk with a round trip per chunk.


Work stays entirely in `supabase/functions/apple-health-sync/index.ts`. No React changes.

## Changes to the edge function

1. **Log every ingress before anything else.** First line of the handler logs method, URL, present headers (names only, no values), content length and a request id. This makes it definitive next attempt whether the device's POST reaches the function at all or dies at the gateway.

2. **Always answer, always fast.** The current handler does chunked inserts with a `select("id")` round trip per chunk before responding. A large HealthKit firehose can blow past the response window, so the shell waits forever. Restructure to: validate → verify consent → acknowledge with `200 {success:true, accepted:N, request_id}` immediately, then finish the inserts in the background with `EdgeRuntime.waitUntil`. Drop the per-chunk `select("id")` and raise chunk size; the response no longer needs row ids.

3. **Never return an empty or non-JSON body.** Every path — 400, 403, 500 — returns a JSON body with `success:false`, `error`, and `request_id`, with CORS headers attached, so the shell's error callback can fire instead of hanging.

4. **Widen CORS and method handling.** Add `Access-Control-Allow-Methods` (POST, GET, OPTIONS), `Access-Control-Max-Age`, and return `200 "ok"` on preflight. Accept `user_id`, `source` and `aca_hash_key` from query params as well as body, since the shell posts the hash on the query string.

5. **Add a reachability probe.** `GET /apple-health-sync?ping=1` returns `{ok:true, ts}` without touching the database, so the device can be tested directly and we can tell a network/gateway failure apart from a payload failure.

6. **Make the consent check forgiving of the shell's shape.** Match the ACA record on `aca_hash_key` first; only require the `platform_guid` match when a profile row exists. A mismatch returns a descriptive JSON error naming which side failed rather than a bare 403.

7. **Report what was dropped.** The response includes counts of records received, accepted and skipped-by-whitelist, so a payload full of unmapped keys shows up as `accepted: 0` instead of a silent success.

## Verification

- `POST` with no body, with a bad ACA, and with a valid metric payload against the live function, confirming each returns JSON quickly.
- Query `raw_health_data` after the valid payload to confirm rows land.
- Re-read the function logs to confirm the new ingress line appears for every call.
