## Fix Privacy hardware permissions

### 1. Hide Bluetooth and NFC rows

In `src/components/settings/PrivacySettings.tsx`, remove the `bluetooth` and `nfc` entries from `HW_ROWS`. That leaves Device Motion, Camera, Health Kit, and Microphone visible.

### 2. Fix "Not available on this device" for Camera / Microphone

**Root cause:** `probeMedia()` in `src/plugins/permissions/index.ts` calls `navigator.mediaDevices.getUserMedia()` from the web layer. Inside WKWebView, that call can fail (or `mediaDevices` can be undefined) even when the native Swift bridge has camera/mic entitlements and the OS grant is valid. The failure gets cached as `unsupported` in `localStorage` (`idia_hw_grant_camera` / `_microphone`) via `useHardwarePermission`, and the UI then permanently shows "Not available on this device".

**Fix in `src/plugins/permissions/index.ts`:**
- In `probeMedia`, when `Capacitor.isNativePlatform()` is true, do **not** treat missing `navigator.mediaDevices` or a `getUserMedia` throw as `unsupported`. On native, hardware access is mediated by the Swift/Kotlin bridge, not the web API. Return `granted` (native entitlements present) or `prompt` (let the OS dialog appear on first real use), never `unsupported`.
- Keep the current web-browser behavior unchanged for non-native platforms, but map generic failures (e.g. `NotFoundError`, missing API in a sandboxed iframe) to `prompt` rather than `unsupported`, so a stale probe never permanently disables the toggle.

**Fix in `src/hooks/useHardwarePermission.ts`:**
- On mount, when hydrating from `localStorage`, if the cached state for `camera` or `microphone` is `unsupported` and we're on a native platform (or `navigator.mediaDevices` now exists), discard the cached value and fall back to `prompt`. This clears the stuck state for users who already hit the bug.

### Out of scope
- No changes to Swift/Kotlin bridges, Info.plist, or AndroidManifest.
- No change to Health Kit or Device Motion flows.
- No visual redesign of the section.
