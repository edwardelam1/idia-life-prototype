# Fix Apple Health anchoring stall — server side only

## What the evidence shows

- `user_aca_records` has 179 `apple_health` consent rows, the newest stamped today at 14:01 UTC — the consent handshake in the app is working.
- `raw_health_data` is completely empty (0 rows, ever) — no health payload has ever landed.
- `apple-health-sync` edge function logs show only boot/shutdown events, no request lines, during the same window the spinner was running.
- The function itself is reachable and healthy from the outside: `OPTIONS` returns 200 with CORS headers, `POST {}` returns a clean 400 "Missing required field: user_id".

So the consent anchor writes fine, the function is up, but the native shell's POST either never arrives or arrives and never gets a response the shell can act on. The spinner never resolves because nothing ever calls the completion handler.

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
