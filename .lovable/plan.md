Re-implement the native download path exactly per the provided specification, with granular flow logging so any silent OS handoff stall is visible in logs.

## Files to change

### 1. `src/utils/nativeDownload.ts` (rewrite)
- Keep `saveFileToDevice({ filename, data, mimeType })` signature.
- On `Capacitor.isNativePlatform()`:
  - Convert `string` data with `btoa(unescape(encodeURIComponent(data)))`.
  - Convert `Blob` data via `FileReader.readAsDataURL` and split off the base64 payload.
  - `Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents })`.
  - Call `Share.share({ title: filename, url: writeResult.uri })` so the OS bridges the file into Files / Downloads / etc.
- On web: build a `data:` URL for strings or `URL.createObjectURL` for Blobs, click a hidden `<a download>`, remove it, and revoke the object URL after 150ms.
- Instrument every branch with `[DOWNLOAD_FLOW_LOG]` START / PROCESS / SUCCESS / ERROR / END logs as specified.
- Rethrow errors so callers can toast.

### 2. `src/utils/identityLedgerExport.ts`
- Update `downloadLedgerCsv` to accept the built CSV string (keep the current `LedgerPayload` overload by generating the CSV internally first, then delegating).
- Build filename `IDIA_Sovereign_Export_${YYYY-MM-DD}.csv`.
- Route through `saveFileToDevice` with `mimeType: 'text/csv'`.
- Add `[LEDGER_EXPORT_LOG]` START / PROCESS / SUCCESS / ERROR / END logs.

### 3. `src/pages/IdentityLedger.tsx`
- No behavioral change beyond awaiting the updated helper (already async) and keeping the existing success/failure toasts.

### 4. `src/components/settings/PrivacySettings.tsx`
- Replace the current inline ToS `onClick` with a dedicated `handleDownloadTOS` handler.
- Add local `isDownloading` state; disable the button while running and show "Preparing File…" label.
- Fetch `/legal/IDIA_Protocol_Terms_of_Service.pdf`, throw on non-OK response, convert to Blob, and pass to `saveFileToDevice` with `mimeType: 'application/pdf'`.
- Toast "Saved to Files" on success, "Download Failed" on error.
- Add `[TOS_DOWNLOAD_LOG]` START / PROCESS / SUCCESS / ERROR / END logs.

## Dependencies
`@capacitor/filesystem` and `@capacitor/share` are already installed (package.json v8). No install needed in-sandbox. After merging, the user still needs to `git pull` and run `npx cap sync` locally before rebuilding the native app for the changes to reach the device.

## Out of scope
- No changes to ledger data fetching, RLS, PDF contents, or CSV schema.
- No changes to routing or other Settings sections.

## Validation
- Type-check the two utility files and the two component files.
- Verify no anchor-based navigation remains on native code paths for either file.
- Confirm logs will surface each stage so, if the OS Share sheet is silently denied on a specific device, the last successful log pinpoints where the handoff stalled.