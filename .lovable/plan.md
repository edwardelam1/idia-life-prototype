# Fix Health Connect (Android) data sync

Android's Health Connect flow has never worked. Apple works because it uses a completely different path (WKWebView bridge → `apple-health-sync`). The Android path is wired to a Capacitor plugin whose methods don't exist and to an edge function that doesn't exist.

## What is actually broken

Verified against `android/app/src/main/java/com/idia/life/plugins/health/IDIAHealthPlugin.kt` (identical to the copy on `feature/android-apple-parity`), `src/plugins/health/index.ts`, `src/services/healthService.ts` and `src/components/AndroidHealthModal.tsx`:

1. **Missing plugin methods.** The JS interface calls `checkAvailability()` and `getHealthData()`. The Kotlin plugin only implements `triggerHardwareAction`, `triggerHealthDataSync`, `requestPermissions`, `checkPermissions`. So `checkAvailability()` rejects, `healthService.getStatus()` swallows it and returns `available: false` — the modal permanently shows "Health Connect not available. Install from Play Store." and the connect button stays disabled.
2. **Payload shape mismatch.** `triggerHealthDataSync` returns metrics nested under `healthData`; the JS `HealthDataResult` expects flat `steps/heartRate/calories/sleepHours` plus `source` and `type`.
3. **Sync target does not exist.** `healthService.syncToSupabase()` invokes `health-data-bridge`. There is no such edge function — the only health ingestion function is `apple-health-sync`. Even a successful read never reaches the database.
4. **No ACA / DELT hash.** `apple-health-sync` rejects any request without `aca_hash_key` and a matching `user_aca_records` row. The Android modal never generates one, unlike `AppleHealthModal`.
5. **Records read but discarded.** HRV, oxygen saturation, respiratory rate, blood pressure and body temperature are declared in the manifest but never requested or read by the plugin.

## Changes

### Native (Kotlin — `android/app/src/main/java/com/idia/life/plugins/health/IDIAHealthPlugin.kt`)
- Add `@PluginMethod checkAvailability()` returning `{ available, platform: "android", apiName: "health_connect" }` based on `HealthConnectClient.getSdkStatus`.
- Add `@PluginMethod getHealthData(options)` accepting `startDate`/`endDate` ISO strings and resolving a **flat** object matching `HealthDataResult`: `recorded_at`, `source: "health_connect"`, `device_type`, `type: "health_metrics"`, `steps`, `heartRate`, `calories`, `sleepHours`, `distance`, `weight`, `height`.
- Extend the permission set and reads to include HRV (`HeartRateVariabilityRmssdRecord`), `OxygenSaturationRecord`, `RespiratoryRateRecord`, `BloodPressureRecord`, `BodyTemperatureRecord` — matching what the manifest already declares.
- Keep `triggerHealthDataSync` and `triggerHardwareAction` untouched so nothing else regresses.

### Web bridge
- `src/plugins/health/index.ts`: no interface change needed; add the extra optional metric fields already declared.
- `src/services/healthService.ts`: replace the `health-data-bridge` invoke with a POST to `apple-health-sync` (the canonical ingestion path), sending `user_id`, `aca_hash_key`, and a flat `healthData` map keyed with the names the function's `healthKitKeyMapping` already understands (`steps`, `heartRate`, `hrv`, `calories`, `bloodOxygen`, `respiratoryRate`, `bpSystolic`, `bpDiastolic`, `bodyTemp`, `sleep`, `weight`, `height`). Accept an optional ACA hash argument on `fetchAndSync`/`quickSync`.
- `src/components/AndroidHealthModal.tsx`: before syncing, mirror the Apple modal — read `profiles.platform_guid`, call `generateACAHash(platformGuid, "health_connect", ["KYC_VAULT","HEALTH_DATA_READ"])`, upsert into `user_aca_records`, then pass the hash into the sync. Surface real plugin errors instead of the blanket "not available" message when availability is genuinely false vs. permission-denied.
- Set `connection_type: "health_connect"` on `data_connections` (already correct) so `useNativeHealth`'s 6-hour staleness check also works on Android — that check currently only looks at `apple_health`, so it will be widened to check whichever platform connection applies.

### Manifest
`android/app/src/main/AndroidManifest.xml` gains the read permissions for the newly-read record types (HRV, oxygen saturation, respiratory rate, blood pressure, body temperature).

## After the change

Requires a native rebuild on your side:

```bash
git pull
npm install
npx cap sync android
npx cap run android
```

No database migration and no edge function redeploy are needed — `apple-health-sync` already accepts non-Apple flat payloads through its direct-bridge key mapping.
