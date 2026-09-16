# Every data source refreshes every 6 hours

Today nothing refreshes on a schedule. There is no scheduled job for any data source in the database — the only refreshes that happen are when a person opens the app, or when Strava happens to push an event. Apple Health's "6 hour" rule exists only inside the app and stops the moment the app is closed, which is why it looks broken.

The fix is one scheduled sweep, owned by our own backend, that runs every 6 hours and refreshes each connected source.

## What gets built

**One scheduler, every 6 hours (`0 */6 * * *`).** A single job wakes a new refresh service. It reads the list of active connections and refreshes each one, source by source, with a per-connection time limit so one stuck account cannot block the others. It writes a result for every connection: refreshed, nothing new, or failed with a reason.

**Nest.** Pulled directly from Google's device API on the same schedule, reusing the existing Nest sync. No Google Cloud Function or Google Cloud Scheduler is needed — the polling loop Google describes is exactly what our scheduled job does, and keeping it on our side means the consent record, the lifestyle tables and the logs all stay in one place. Expired Google tokens are renewed automatically before the pull.

**Ford.** Pulled on the same schedule using the existing vehicle sync, with the token renewed first. Currently it is only ever pulled by hand from the app.

**Strava.** Strava has no scheduled pull at all today — it only reacts to pushed events, and its access tokens expire every 6 hours, so a quiet account silently goes dead. The refresh service will renew the token and pull activities recorded since the last successful sync, so a missed push can never lose data.

**Apple Health and Health Connect.** These cannot be pulled from a server: the readings live on the phone and only the phone can read them. So the sweep does the only thing that works — for each phone whose last successful sync is older than 6 hours, it sends a silent background notification that wakes the app and asks it to read and upload. Phones that answer stop being stale; phones that never answer are marked stale in the connection record so the Data screen can show it honestly. The in-app timer stays as a second net.

**Visibility.** Every source keeps a last-refreshed timestamp, a status and a failure count, and each step of the sweep logs a clear begin and end line so a stall is always attributable. No fabricated readings anywhere: an empty response is recorded as an empty sync.

## Technical detail

- New edge function `data-source-refresh`: selects `data_connections` where `is_active = true`, groups by `connection_type`, and dispatches per type with bounded concurrency and per-connection try/catch. Accepts an optional `{ connection_type, user_id }` body for manual/targeted runs.
- Dispatch map: `nest` → `nest-sync`; `ford` → `ford-vehicle-data`; `strava` → new pull path (refresh token at `https://www.strava.com/oauth/token`, then `GET /api/v3/athlete/activities?after=<last_successful_sync>`), added to `ingest-strava-data` as an explicit `pull` branch — the webhook branch and the existing no-simulated-data policy stay as they are; `apple_health` / `health_connect` → silent push via the existing push bootstrap, plus `sync_status = 'stale'` when older than 6h.
- pg_cron job `data-source-refresh-6h` at `0 */6 * * *`, calling the function with the service-role authorization header pattern already used by the other jobs in this project.
- Updates `last_sync_at`, `last_successful_sync`, `sync_status`, `sync_failure_count` on every connection touched. Strava data continues through its existing ingestion path; Nest continues through `raw_app_data` → `lifestyle_processing_queue` → `staged_lifestyle_data`. The health pipeline and the Apple Health edge function are not modified.
- Cadence note: 4 runs per day per source. That is the lowest frequency that satisfies the 6-hour freshness requirement, and it costs one short function run per cycle.

## Verification

Force one run manually and confirm in the logs: Nest returns devices or an honest empty sync, Ford returns vehicles or a clear token error, Strava returns activities since the last sync, and stale phones receive the wake notification. Then confirm the next scheduled run lands exactly 6 hours later and the timestamps on the Data screen move.
