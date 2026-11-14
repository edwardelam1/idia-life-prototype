# Xcode notification review

Reviewed the supplied `ContentView` source statically. Swift was not compiled, and no changes were made to Apple Health.

## Present and compatible

- `UserNotifications` is imported.
- `nativePush` is installed in the WKWebView and requests alert, sound, and badge permission.
- The bridge forwards `APNSTokenReceived` into `push:token-received`, matching the web application.
- Foreground activation emits `app:foreground`, matching both token registration and mandatory consent revalidation.

## Required ContentView changes

### 1. Report denied permission and registration errors

The current `nativePush` authorization callback ignores `error` and does nothing when `granted` is false. Emit `push:permission-denied` in both cases; otherwise the Settings switch waits 15 seconds and shows a timeout instead of the actual permission outcome.

### 2. Register with Apple even when a cached token exists

After permission is granted, call `UIApplication.shared.registerForRemoteNotifications()` every time registration is requested. The cached token may be emitted immediately, but it must not replace registration with Apple: tokens can change.

### 3. Preserve early tokens and safely encode event details

Both the observer and cached-token path should set `window.__idiaPendingPushToken` before dispatching the event. Also replay the cached token from `didFinish`, since an event delivered before JavaScript listeners attach can be lost. Use JSON serialization rather than interpolating tokens or error messages into quoted JavaScript strings. An apostrophe or newline in an error currently breaks the script.

Suggested helper inside the existing Coordinator (merge into the existing source; this is not a replacement file):

```swift
private func sendPushEvent(_ name: String, detail: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: detail),
          let json = String(data: data, encoding: .utf8) else { return }
    // Call this helper only with the fixed event names below.
    let script = """
    const detail = \(json);
    if (typeof detail.token === 'string') {
        window.__idiaPendingPushToken = detail.token;
    }
    window.dispatchEvent(new CustomEvent('\(name)', { detail }));
    """
    DispatchQueue.main.async { [weak self] in
        self?.healthKitManager.webView?.evaluateJavaScript(
            "(() => { \(script) })();", completionHandler: nil
        )
    }
}
```

Use `sendPushEvent("push:token-received", detail: ["token": token])` in the observer and cached-token path. Use `sendPushEvent("push:permission-denied", detail: ["error": "Notification permission denied"])` on denial, and a generic error on failure. Never print device tokens.

### 4. Only accept native messages from the trusted main frame

At the beginning of `userContentController(_:didReceive:)`, validate `message.frameInfo.isMainFrame` and its `securityOrigin` against the trusted Life HTTPS origin. Current navigation permits arbitrary web destinations, and every registered native handler is otherwise exposed to their JavaScript. This is a security recommendation for the wrapper; do not broaden native bridge access to arbitrary sites.

## AppDelegate and app entry are still needed

This upload references `AppDelegate.currentAPNSToken` but does not include AppDelegate or the SwiftUI `App` entry. These must be checked before declaring notifications fixed:

- SwiftUI entry installs the delegate using `@UIApplicationDelegateAdaptor`.
- `didRegisterForRemoteNotificationsWithDeviceToken` converts the real `Data` token to hex, caches it, and posts `APNSTokenReceived` on the main thread. Do not log the token.
- `didFailToRegisterForRemoteNotificationsWithError` posts `APNSError` with a safely encoded generic error.
- `UNUserNotificationCenter.current().delegate` is assigned to a retained delegate.
- `willPresent` calls its completion handler with the intended foreground presentation, e.g. `[.banner, .list, .sound]`.
- `didReceive response` invokes its completion handler and handles the fixed `review-consent` action. Emit `push:notification-tapped` for an already loaded web view; preserve a pending tap during cold launch and replay after document load. Do not navigate to an untrusted URL from a notification payload. Normal launch and foreground return already re-check mandatory consent.

## Xcode settings not established by this source

Confirm the actual signed app identifier and team match the securely configured Apple settings. Confirm the Push Notifications capability and signed `aps-environment` entitlement. TestFlight/App Store tokens use production APNs; local development tokens generally use sandbox APNs. A Background Modes / Remote notifications capability is needed for silent background pushes, not for this visible Terms alert. No silent health wake-up was added in this task.

## Sender operations

The deployed `broadcast-tos-update` endpoint accepts only an authenticated account with the existing protected `super_admin` role:

- `{ "mode": "preview" }`: counts registered iPhones without sending.
- `{ "mode": "test" }`: sends to one opted-in iPhone registered to that administrator; optional `device_id` selects one of their own registrations.
- `{ "mode": "broadcast", "confirmation": "SEND_TERMS_UPDATE", "device_test_confirmed": true }`: sends the fixed Terms campaign only after Apple accepted a test and the operator confirms its display. At most 100 registrations are processed per call; use the returned `next_after_id` to continue.

Unique delivery claims prevent automatic duplicate sends. Failed or uncertain claims are not automatically retried, because Apple may have accepted a timed-out request. Investigate delivery records before an explicit retry is designed. An Apple success response proves acceptance, not actual display on a phone. No campaign has been sent by this review.