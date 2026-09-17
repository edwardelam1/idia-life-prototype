# Refresh connected sources when you open the app

Today nothing pulls fresh data when you wake the app. The 6-hour sweep runs on a server timer only, and the Data screen just re-reads whatever is already stored — so reopening the app shows the same stale timestamps. Only Apple Health / Health Connect has a wake check, and it is native-only and silent.

## What changes

- Opening the app (or switching back to it) asks your connected sources for fresh data, for your account only.
- It runs when the Data screen mounts and whenever the app returns to the foreground, with a cooldown so quickly switching in and out does not hammer the services.
- Only sources that are actually due (last successful pull older than the freshness window) are refreshed; fresh ones are left alone.
- While a refresh is running, the Data screen shows a subtle "Refreshing…" state; when it finishes, the timestamps and Active Streams update themselves.
- A pull-to-refresh style manual trigger: tapping the existing refresh affordance on the Data screen forces a refresh of every connected source, ignoring the cooldown.
- Apple Health / Health Connect keeps its existing on-device path untouched — it is simply included in the same wake check so its timestamp moves too.
- Failures are quiet: the screen shows the source's last-known state and its status, no error popups on a routine wake.

## Technical detail

- `data-source-refresh` gains a user-scoped invocation path: it already accepts `user_id`, but it runs under service role and is not safe to call from the client with a user id in the body. Add JWT verification for client calls — when an `Authorization` bearer user token is present, resolve the caller with `auth.getUser()` and ignore any `user_id` in the body, so a client can only ever refresh its own connections. Scheduled cron calls keep using the service-role key and the all-connections path. Register the function in `supabase/config.toml` with `verify_jwt = false` (the function does its own auth branch).
- Add a `respect_freshness` flag (default true for wake calls, false for the manual button) so a wake only pulls connections whose `last_successful_sync` is older than the 6-hour window.
- New hook `src/hooks/useSourceWakeRefresh.ts`: on mount and on `visibilitychange` → visible (plus Capacitor `appStateChange` when available), if the last client-side trigger is older than the cooldown (5 minutes, stored in `localStorage` per user), invoke `data-source-refresh` with the user session, then re-read connections.
- `DataDashboard.tsx` consumes the hook: exposes `isRefreshing`, calls `fetchConnections()` on completion, and wires the manual force-refresh. No changes to connection logic, OAuth flows, consent artifacts, lifestyle tables, or the health pipeline.

## Verification

- Open the app with Strava connected and a stale timestamp: the Strava row's "last synced" moves and new activities appear.
- Background the app, wait past the cooldown, foreground it: the refresh runs again.
- Foreground twice within the cooldown: only one refresh is dispatched.
- Signed-in user A cannot refresh user B's connections (body `user_id` is ignored).
- Cron run at `0 */6 * * *` still sweeps all users unchanged.
