## Problem

The toggles in **Settings → Privacy → Hardware Permissions** only write a boolean to `preferences` in Supabase. They don't:
1. Trigger any native OS permission prompt
2. Reflect the actual OS-granted state
3. Gate the underlying feature when the user turns them off

Result: flipping a switch does nothing observable. To make these functional, three things have to line up: **(a) native manifests declare the permission**, **(b) the toggle invokes a request bridge**, and **(c) feature code checks the toggle/grant before using the hardware**.

## 1. Native declarations (must exist or the OS will hard-deny)

### iOS — `Native/ios/Info.plist`
Currently has only URL schemes. Add usage-description strings (no string = silent crash on first use):
- `NSMotionUsageDescription` — "IDIA uses motion to verify spatial presence during NFC handshakes."
- `NSCameraUsageDescription` — "Used for AR Shop discovery and QR scanning."
- `NSHealthShareUsageDescription` + `NSHealthUpdateUsageDescription` — "Sync vitals to your Sovereign Health ledger."
- `NSBluetoothAlwaysUsageDescription` + `NSBluetoothPeripheralUsageDescription` — "Detect nearby wearables and proximity tags."
- `NSMicrophoneUsageDescription` — "Voice commands for the Friend assistant."
- `NFCReaderUsageDescription` — "Tap-to-pay and Sovereign Handshake."
Plus capability entries: `com.apple.developer.healthkit`, `com.apple.developer.nfc.readersession.formats` (TAG / NDEF) in the `.entitlements` file (HealthKit entitlement is in `LovableHealthWrapper.entitlements`; NFC reader needs to be added).

### Android — `Native/android/AndroidManifest.xml` (verify; add if missing)
- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`
- `android.permission.BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+), legacy `BLUETOOTH`/`BLUETOOTH_ADMIN`
- `android.permission.NFC` + `<uses-feature android:name="android.hardware.nfc" />`
- `android.permission.ACTIVITY_RECOGNITION` (motion)
- Health Connect: `android.permission.health.READ_STEPS`, `READ_HEART_RATE`, etc.

## 2. Wire each toggle to a real permission request

Add a single `useHardwarePermission` hook in `src/hooks/useHardwarePermission.ts` that:
- Reads/writes the `preferences.privacy_<x>` flag (existing behavior)
- On flip ON, calls a per-hardware request function that prompts the OS
- On flip OFF, only clears the preference (OS does not allow programmatic revocation — instruct user to revoke via Settings)
- Updates UI to "Open System Settings" if the user previously denied at OS level

Per-hardware request mapping:

| Toggle | Request path |
|---|---|
| Device Motion | iOS: `CMMotionManager` permission via `requestMotionAndFitnessAuthorization` (already initialized in `Coordinator`); expose a `requestMotion` bridge message. Android: runtime request for `ACTIVITY_RECOGNITION` via Capacitor. |
| Camera | Web API: `navigator.mediaDevices.getUserMedia({ video: true })` — triggers the WKWebView capture handler (already grants in `requestMediaCapturePermissionFor`). Add a "test camera" probe on toggle. |
| Health Kit | Existing `useNativeHealth.requestPermissions()` — already wired through `IDIAHealthPlugin`. Just call it from the toggle. |
| Bluetooth | iOS: instantiate `CBCentralManager` (new Swift bridge `requestBluetoothPermission`). Web: `navigator.bluetooth.requestDevice` not viable on iOS WKWebView — must use native bridge. |
| Microphone | `navigator.mediaDevices.getUserMedia({ audio: true })` — Swift `requestMediaCapturePermissionFor` already grants; the actual OS prompt fires from the underlying `AVAudioSession`. |
| NFC Scan | iOS: NFC is request-on-use, not request-upfront. Toggle should run a one-time `nfcManager.beginHandshake` probe with a no-op session OR simply gate the existing `useNFCBridge.initiateSovereignHandshake` on the preference. |

Add 6 new Swift bridge handlers in `Native/ios/ContentView.swift` Coordinator: `requestMotionPermission`, `requestBluetoothPermission`, `requestCameraPermission`, `requestMicPermission`, `requestNfcCapability`, `requestHealthPermission` — each calling the appropriate Apple API and resolving back via `window.on<X>PermissionResult(granted)`.

Mirror on Android in a new `IDIAPermissionsPlugin.kt` using `ActivityCompat.requestPermissions`.

Expose all of this through one TS plugin: `src/plugins/permissions/index.ts` with `registerPlugin<IDIAPermissionsPlugin>('IDIAPermissions', ...)`.

## 3. Gate feature code on the preference

Every place that touches hardware must check the toggle and short-circuit with a toast if disabled:
- `useNFCBridge.initiateSovereignHandshake` → check `preferences.privacy_nfc`
- `healthService.quickSync/fetchAndSync` → check `preferences.privacy_health`
- `AudioRecorder` / voice features → check `preferences.privacy_microphone`
- Camera/AR Shop components → check `preferences.privacy_camera`
- Motion-driven Sphere of Influence / proximity → check `preferences.privacy_motion`
- BLE proximity in `useProximityBridge` → check `preferences.privacy_bluetooth`

## 4. UI changes in `PrivacySettings.tsx`

- Show three states per row: **Granted** (green dot), **Denied at OS** (amber, with "Open Settings" link via `Capacitor.openAppSettings()`), **Off** (user-disabled in-app).
- On first toggle ON, fire the request; if OS denies, leave the switch off and show a hint.
- Hide rows when not on a native platform (web build can't honor most of these).

## Files to change

- `Native/ios/Info.plist` — add 7 usage description keys
- `Native/ios/LovableHealthWrapper.entitlements` — add NFC reader formats
- `Native/ios/ContentView.swift` — add 6 permission bridge handlers
- `Native/android/AndroidManifest.xml` — declare permissions (if not already)
- `Native/android/IDIAPermissionsPlugin.kt` — new file
- `src/plugins/permissions/index.ts` + `web.ts` — new Capacitor plugin
- `src/hooks/useHardwarePermission.ts` — new hook
- `src/components/settings/PrivacySettings.tsx` — three-state UI, wire to hook
- Hardware-touching call sites (NFC bridge, health service, audio recorder, camera/AR, proximity) — add preference guards

## Out of scope

- No DB schema changes (the `preferences.privacy_*` columns already exist)
- No changes to wallet, governance, or onboarding flows
- Re-prompting after OS-level revocation (iOS doesn't allow this — only deep-link to Settings)

## After implementation

User must `git pull` + run `npx cap sync ios && npx cap sync android` so the updated `Info.plist`, entitlements, manifest, and native plugin classes ship into the Xcode/Android Studio projects. The Lovable hot-reload server can't change native plist/manifest at runtime.
