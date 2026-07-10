# Enable Push Notifications via Native Entitlements

The iOS raw-WKWebView shell and the Android Capacitor shell now both have push entitlements enabled. The web layer just needs to bridge to them correctly and persist the returned device token so Supabase can dispatch pushes.

## What's wrong today

- `usePushNotifications.ts` only speaks to the iOS `nativePush` WebKit bridge. On Android it falls through to the browser `Notification` API, which returns a fake `web-*` token and never asks Android for POST_NOTIFICATIONS or registers with FCM.
- No listener is attached at app boot, so if Swift/Kotlin fires `push:token-received` before the settings screen mounts, the token is dropped.
- Tokens are written to `push_tokens` but there is no confirmation surfaced to the user, and failed platform detection leaves the toggle in a lying state.

## Changes

### 1. `src/hooks/usePushNotifications.ts`
- Add an Android branch that prefers Capacitor's `@capacitor/push-notifications` plugin (already available in the Android shell) — `PushNotifications.requestPermissions()` + `register()`, then persist the FCM `token.value` with `platform: 'android'`.
- Keep the iOS `window.webkit.messageHandlers.nativePush` bridge but also honor an initial token delivered before the listener attaches (read `window.__idiaPendingPushToken` if Swift stashed it early).
- Return a discriminated result `{ ok: boolean; platform: 'ios'|'android'|'web'; reason?: string }` so the UI can show the exact denial cause.

### 2. `src/utils/pushBootstrap.ts` (new)
- Mount once from `App.tsx`. Attaches global listeners for `push:token-received` / `push:permission-denied` (iOS) and Capacitor's `pushNotificationsService` `registration` / `registrationError` events (Android) so a token arriving during cold-boot is persisted to `push_tokens` for the signed-in user even if Settings never opens.
- Also registers a foreground `pushNotificationReceived` handler that routes through `notify.info(...)` so incoming pushes surface in-app (respecting Focus Mode via existing `notify.ts`).

### 3. `src/components/settings/NotificationSettings.tsx`
- Use the richer result from `enablePush()` to show a precise toast when permission is denied vs. when the bridge is missing (older shell build), and disable the switch while the request is in flight.

### 4. `src/vite-env.d.ts`
- Add `window.__idiaPendingPushToken?: string` so the early-token handoff is typed.

### 5. `capacitor.config.ts`
- Add the `PushNotifications` plugin block with `presentationOptions: ['badge','sound','alert']` so the Android shell displays heads-up notifications when the app is foregrounded. No changes to iOS entitlements — already handled in the native shell.

## Technical notes

- iOS shell already calls APNs registration at launch and dispatches `push:token-received`; nothing native needs to change.
- Android shell uses Capacitor, so `@capacitor/push-notifications` is the correct API — no custom Kotlin bridge required. If the package isn't installed yet the bootstrap will detect its absence and no-op gracefully.
- The `push_tokens` table is already keyed on `(user_id, token)` with upsert, so re-registrations are safe.

## Out of scope

- Server-side dispatch (APNs/FCM sender) — the token registration is the missing piece; sending is handled by existing edge functions.
- Notification categories / action buttons.
