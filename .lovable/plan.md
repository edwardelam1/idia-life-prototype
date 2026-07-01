## Problem

On the native (Capacitor) app, the current download flows don't actually save files to the device:

- **Identity Ledger CSV** uses a web `<a download>` blob trick. Inside the Capacitor WebView this opens the CSV inline in the WebView (or a system viewer) with no back button, effectively locking the user on that screen.
- **Terms of Service PDF** uses `<a href="/legal/....pdf" download>`. Same issue — the WebView navigates to the PDF and there's no way back.

Both need to write to the device's file system and hand off to the OS so the user gets a real "Saved to Files/Downloads" experience and stays inside the app.

## Fix

Use `@capacitor/filesystem` + `@capacitor/share` (already the standard Capacitor pattern) with a graceful web fallback.

### 1. Add a shared helper `src/utils/nativeDownload.ts`

Exports `saveFileToDevice({ filename, data, mimeType })`:

- **Native (iOS/Android)**: `Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents })`, then `Share.share({ url: writeResult.uri, title: filename })` so the user picks "Save to Files", "Downloads", email, etc. Toast: "Saved to Files."
- **Web**: keep the existing blob + `<a download>` path (works fine in real browsers).
- Detect native via `Capacitor.isNativePlatform()`.
- Accepts either a `string` (text like CSV) or `Blob` (binary like PDF); converts to base64 for Filesystem.

### 2. Identity Ledger (`src/utils/identityLedgerExport.ts` + `IdentityLedger.tsx`)

Replace `downloadLedgerCsv()` internals to call `saveFileToDevice({ filename: 'IDIA_Sovereign_Export_<date>.csv', data: csv, mimeType: 'text/csv' })`. Page code unchanged aside from awaiting the promise and showing the toast on success/failure.

### 3. Terms of Service (`PrivacySettings.tsx`)

Replace the `<a href download>` with a Button `onClick` that:

- `fetch('/legal/IDIA_Protocol_Terms_of_Service.pdf')` → `blob()`
- Calls `saveFileToDevice({ filename: 'IDIA_Protocol_Terms_of_Service.pdf', data: blob, mimeType: 'application/pdf' })`
- Shows toast on success/failure.

This keeps the user inside the app; the OS share sheet handles the actual save location.

### 4. Dependencies

Add `@capacitor/filesystem` and `@capacitor/share`. After merge the user runs `npx cap sync` (standard Capacitor step).

## Out of scope

- No changes to ledger data fetching, RLS, or CSV contents.
- No changes to the PDF file itself.
- No new UI screens; existing viewer and Privacy tab keep their layout.

## Technical notes

- `Directory.Documents` is user-visible in the iOS Files app under the app's folder and in Android's Documents. Combined with the Share sheet the user can relocate to Downloads/iCloud/etc.
- Base64 conversion: use `FileReader.readAsDataURL` for Blob, or `btoa(unescape(encodeURIComponent(str)))` for text.
- Web fallback preserves current behavior for the Lovable preview and desktop browsers.
