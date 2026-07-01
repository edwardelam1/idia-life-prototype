## Fix: Custom `nativePush` WebKit bridge for APNs in the raw WKWebView shell

The IDIA iOS shell runs a raw `WKWebView`, bypassing Capacitor, so `@capacitor/push-notifications` never resolves and the toggle silently fails. Route push registration through a custom `window.webkit.messageHandlers.nativePush` bridge — same pattern already used for `nativeDownload` / NFC.

## Files to change

### 1. `src/hooks/usePushNotifications.ts` (rewrite)
Replace the entire file:
- Detect `window.webkit?.messageHandlers?.nativePush`. If present, `postMessage({})` to trigger the native permission prompt.
- Listen for `push:token-received` (success) and `push:permission-denied` (failure) `CustomEvent`s dispatched by Swift.
- On success: upsert `{ user_id, token, platform: "ios" }` into `push_tokens` (conflict on `user_id,token`) and resolve `true`.
- On denial or 15s timeout: cleanup listeners, notify user, resolve `false`.
- Guarded with a `settled` flag so success/error/timeout can't double-resolve; both listeners removed on every exit path.
- Desktop fallback: `Notification.requestPermission()` + synthetic `web-<uid>-<ts>` token, upsert with `platform: "web"`.
- `disable()` unchanged: delete the user's `push_tokens` rows.

Reuses the existing generic `Window.webkit.messageHandlers` declaration in `src/vite-env.d.ts` — no `declare global` needed.

### 2. No other React changes
`push_tokens` table already exists (6 cols, 4 policies). No migration. `NotificationSettings.tsx` (the only caller) is untouched — its `handlePushToggle` already treats a `false` return as "permission denied, leave preference off".

## Swift side (user does in Xcode — out of this repo)
1. **`LifeApp.swift` / AppDelegate**: attach `@UIApplicationDelegateAdaptor`; in `didFinishLaunchingWithOptions` set `UNUserNotificationCenter.current().delegate` and call `UIApplication.shared.registerForRemoteNotifications()` at launch; cache the hex token in `AppDelegate.currentAPNSToken` from `didRegisterForRemoteNotificationsWithDeviceToken`. Handle `didFailToRegisterForRemoteNotificationsWithError` too.
2. **`ContentView.swift`**: register `nativePush` message handler alongside `nativeDownload`. In the handler call `UNUserNotificationCenter.current().requestAuthorization(options:[.alert,.badge,.sound])`; on grant, read the cached token and `webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('push:token-received',{detail:{token:'<hex>'}}))")`. On denial, dispatch `push:permission-denied` with the error message.
3. **Xcode target**: enable the **Push Notifications** capability so the APNs entitlement is injected.

## Out of scope
- No APNs delivery pipeline / edge function changes.
- No `push_tokens` schema changes.
- `@capacitor/push-notifications` npm package left in place (harmless).
- No Android bridge — iOS-only, matching the current native shell.

## Validation
- Type-check the rewritten hook.
- On device (after Xcode rebuild + capability enabled): toggling push → iOS permission modal → log `🔔 [PUSH_LOG] APNs Token received: <hex>` → row in `push_tokens` with `platform = 'ios'`.
- On web preview: toggling → browser Notification prompt → row with `platform = 'web'`.
