
# 6-Hour Health Sync: Cron-Only Staleness Flag

No new edge functions. No APNs. A Postgres cron job marks stale Apple Health connections every 6 hours; the app reacts to that flag whenever it's running or foregrounded and runs the real sync.

```text
pg_cron (0 */6 * * *)
   -> UPDATE data_connections SET sync_requested_at = now()
        WHERE connection_type = 'apple_health'
          AND (last_sync_at IS NULL OR last_sync_at < now() - interval '6 hours')
   -> app (Realtime row update / foreground check)
        -> healthService.quickSync() -> apple-health-sync
```

## Correction adopted
`health-data-bridge` is not an edge function and will be removed from the codebase. `src/services/healthService.ts` currently calls `supabase.functions.invoke('health-data-bridge', ...)` — that dead call gets repointed to **`apple-health-sync`**, the only health ingest function. No other reference to the bridge will remain anywhere.

## Step 1 — Schema
Migration adding to `data_connections`:
- `sync_requested_at timestamptz` — set by cron when the connection goes stale.
- `sync_ack_at timestamptz` — set by the client after a successful sync, so a pending request is only "open" while `sync_requested_at > coalesce(sync_ack_at, 'epoch')`.

Both nullable with no default; existing rows are unaffected.

## Step 2 — Cron job
Applied via the insert tool (pure SQL, no project keys, no `pg_net` needed):
- Enable `pg_cron`.
- `cron.schedule('health-sync-staleness-6h', '0 */6 * * *', $$ ... $$)` running the `UPDATE` above. It only touches rows already past the 6-hour window, so a recently foregrounded user is never flagged.

## Step 3 — Client reaction (`src/hooks/useNativeHealth.ts`)
- Subscribe (inside `useEffect`, cleaned up with `removeChannel`) to `postgres_changes` UPDATEs on the user's own `data_connections` row for `apple_health`. When `sync_requested_at` advances past `sync_ack_at`, call the existing `runIfStale()` path.
- On successful sync, write `sync_ack_at = now()` alongside the existing `last_sync_at` update so the request is closed and won't re-fire.
- The current mount / visibilitychange / 6h-interval checks stay exactly as they are — the flag is an additional trigger, not a replacement.

## Step 4 — Repoint the sync call
`src/services/healthService.ts`: `syncToSupabase()` invokes `apple-health-sync` with that function's expected payload shape instead of the nonexistent `health-data-bridge`. Error logging renamed accordingly.

## Honest limitation
Because there's no push, a device that is fully backgrounded or closed won't sync until the app next runs. The flag guarantees that the *first* moment the app is alive after the 6-hour mark, a sync fires — the cron makes the schedule authoritative and server-owned, but delivery is still app-lifetime bound.

## Out of scope
No edge functions created or modified. No APNs/FCM work. No Swift or Kotlin changes.
