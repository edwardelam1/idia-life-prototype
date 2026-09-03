# Restore the Ping + Service-Role Ingress on `apple-health-sync`

The last change made this function strict-POST-only, so `GET ?ping=1` now returns **405**. Your new spec reverses that: the ping must answer **200**, and POST must ingest with the service-role key. This plan applies your spec while keeping the parts of the pipeline that actually write data.

## What changes in `supabase/functions/apple-health-sync/index.ts`

1. **CORS** — allow `POST, GET, OPTIONS` again; `OPTIONS` returns `ok` with the headers, logged as `[EDGE_CORS]`.
2. **Restore the ping** — `GET ?ping=1` returns `200 {"status":"awake"}` with `[EDGE_PING]` logs. This removes the 405 the UI/shell is hitting.
3. **POST branch — strict execution order** (this ordering is load-bearing; the logs show empty `{}` background posts dying with 400 because `user_id` was validated first):
   - `[EDGE_INIT]` on every request with the method.
   - **Step 1: parse JSON safely** — `const body = await req.json().catch(() => ({}))`.
   - **Step 2: empty-payload check FIRST**, before any field validation — `const healthRecords = body.data || body.healthData; if (!healthRecords || (Array.isArray(healthRecords) && healthRecords.length === 0))` → the exact `[EDGE_PAYLOAD_EMPTY]` BEGIN/END block + **200** `{success:true,message:"No data to process"}`. Empty background-task posts can no longer hit the 400 path.
   - **Step 3: validate `user_id`** → missing → the exact `[EDGE_PAYLOAD_FATAL]` "Missing user_id in payload." block + **400** `{error:"Missing user_id"}`.
   - `[EDGE_PROCESS]` log with record count and ACA hash.
   - Service-role client from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (already how the function builds its client) — this is what bypasses the expired-token 403s from iOS background tasks.
   - Insert failure → `[EDGE_DB_FATAL]` + throw into the catch → **500**.
   - Success → `[EDGE_SUCCESS]` + **200** `{success:true, processed_count}` so `evaluateSyncSuccess` fires.
   - Catch → `[EDGE_CATCH_FATAL]` + **500**.
4. **Any other method** → `[EDGE_METHOD_FATAL]` + **405** with CORS headers.

## Two corrections to the pasted block (needed or ingestion silently breaks)

- **Target table.** Your snippet inserts into the placeholder `your_health_table_name`. The real table is **`raw_health_data`**, and it does not accept Swift's raw sample shape directly — rows need `user_id`, `aca_hash_key`, `device_type`, `raw_payload`, `recorded_at`, `processing_status`, `step_count`. So the existing HealthKit key-mapping + row-builder stays in place between `[EDGE_PROCESS]` and the insert; a bare `.insert(body.data)` would fail on every row and return 500.
- **Payload shape.** Two non-Swift callers also POST here — `src/services/healthService.ts` (Android Health Connect) and the `daily-apple-health-sync` cron — and they send `healthData`, an object, not a `data` array. The empty-payload check will treat "no `data`/`healthData`, or an empty one" as the empty case so both pipelines keep working.

Everything else you specified is applied literally, including the exact log strings and the BEGIN/END delimiter lines.

## Kept from the current function

DELT/ACA verification against `user_aca_records`, the HealthKit → internal key mapping, the chunked `raw_health_data` inserts, and the `data_connections` "healthy" stamp. These are the steps your `// Execute database insert logic here` comment stands in for.

## Technical details

- File touched: `supabase/functions/apple-health-sync/index.ts`. No frontend change, no migration.
- Deploy immediately after editing, then verify: `GET ?ping=1` → 200 `{"status":"awake"}`, `POST {}` → 200 "No data to process", and a real Swift POST → `[EDGE_INIT] → [EDGE_PROCESS] → [EDGE_SUCCESS]` in the logs with rows in `raw_health_data`.
