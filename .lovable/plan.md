## Goal

1. Actually **gate notifications during Focus Mode** so the toggle and time window in Settings suppress alerts/sounds/pushes.
2. **Remove the "Email Comms" section** from Notification Settings (the frozen Security Alerts switch and the placeholder marketing/reports rows go with it).

## Changes

### 1. `src/lib/notify.ts` — honor quiet hours in the unified notify pipeline

- Extend `prefsCache` to also hold `quiet_hours_enabled`, `quiet_hours_start` (e.g. `"22:00"`), `quiet_hours_end` (e.g. `"08:00"`).
- Update `hydratePrefs()` to select those three columns and refresh them in the realtime `user_preferences` subscription (already listens for `*` events — just widen the payload mapping).
- Add a small `isInQuietHours(now = new Date())` helper that returns true when `quiet_hours_enabled === true` and the current local `HH:MM` falls inside the window, including the wrap-around case (e.g. 22:00 → 08:00).
- In `fire()`:
  - Always keep writing to `notificationStore` (so the bell history is complete) unless `in_app_alerts` is already off.
  - When `isInQuietHours()` is true: **skip the sonner toast and the chime** regardless of `in_app_sounds`. Nothing pops on screen and nothing beeps.
  - Outside quiet hours: behave exactly as today.

### 2. `src/hooks/usePushNotifications.ts` — respect quiet hours for locally-scheduled pushes

- Before scheduling any Capacitor `LocalNotifications` or emitting an OS push through the same wrapper, read the same three preference fields (single query, cached) and no-op the schedule call when currently in the quiet window. Server-driven remote pushes (APNs/FCM) can't be blocked client-side, so this only affects locally triggered ones — good enough for the current call sites.
- If the file doesn't already schedule local notifications, this step is skipped and only `notify.ts` needs the change.

### 3. `src/components/settings/NotificationSettings.tsx` — remove Email Comms

- Delete the entire `{/* 4. Email Comms */}` section (Security Alerts row, Product Updates row, Monthly Reports row).
- Remove the now-unused `Mail` and `ShieldAlert` imports from `lucide-react`.
- Leave the Focus Mode section untouched — its DB writes already flow through `updatePreferences` and will now actually take effect thanks to change #1.

## Out of scope

- No schema changes. `user_preferences.quiet_hours_*` and `focus_modes` already exist and are already written to.
- No edge function changes. `send-security-alert` keeps logging server-side events; the UI simply stops advertising email delivery it can't perform on this external-Supabase project.
- No new email provider wiring. If you later want real security emails, we can add a Resend (or similar) connector as a follow-up.

## Verification

- Toggle Focus Mode on, set start/end to bracket the current time → trigger any action that fires `notify.*` (e.g. save a setting) → no toast, no chime, but the item still appears in the bell dropdown.
- Toggle Focus Mode off → toasts and chimes resume immediately (realtime cache refresh).
- Notification Settings screen shows only In-App Center, Push Notifications, and Focus Mode sections.
