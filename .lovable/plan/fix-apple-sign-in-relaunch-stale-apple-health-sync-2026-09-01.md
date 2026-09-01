# Fix Apple Sign-In Relaunch + Stale Apple Health Sync

## 1. Apple Sign-In crashes / relaunches from splash

In the iOS shell (a plain WKWebView, not Capacitor), `Capacitor.isNativePlatform()` is false, so Apple sign-in falls to the web OAuth branch in `src/pages/Auth.tsx`. There, the deep-link redirect is applied only when the provider is Google:

```text
useDeepLink = isNative || (inIdiaShell && provider === "google")
```

Apple therefore redirects to `window.location.origin`, which navigates the host webview away and makes the shell re-boot the app from the splash screen. Google works because it gets `idialife://auth-callback`.

Fix: apply the deep-link redirect to Apple in the shell as well — drop the provider condition so any OAuth provider inside the shell uses `idialife://auth-callback`. The existing `IDIA_AUTH_COMPLETE` / `IDIA_AUTH_CANCELLED` message listeners and the `App.tsx` callback handler then finish the session in the original window, matching Google's behavior.

## 2. Stale Apple Health modal (expired JWT deadlock)

Two coordinated changes, as specified:

**a. New hook `src/hooks/useHealthKitHydrator.ts`**
On app launch (and after sign-in), fetch the fresh Supabase session, confirm `data_connections` has an active `apple_health` row, resolve `platform_guid` from `profiles`, read the locked `aca_hash_key` from `user_aca_records`, and post a `comprehensive_health_sync` message to `window.webkit.messageHandlers.syncHealthData` with the fresh `access_token`. Runs once per mount, guarded by a ref, delayed ~1s for cold boot. No-ops on web (no webkit bridge).

Refinement over the draft: re-run the push on `onAuthStateChange` sign-in/token-refresh so the native layer never holds a dead token, and use the vanity Supabase URL already configured in the client rather than a hardcoded project URL.

**b. Edge function `supabase/functions/apple-health-sync/index.ts`**
Switch identity resolution from the payload `user_id` to a service-role reverse lookup: `aca_hash_key` → `user_aca_records.platform_guid` → `profiles.user_id`. All inserts, the `data_connections` upsert, and the DELT verification use that authenticated user id. Missing/unknown hash returns 400/403 as before. `user_id` in the body is ignored.

`verify_jwt = false` is already set for `apple-health-sync` in `supabase/config.toml`, so background posts with an expired token reach the function. No deploy command needed — deployment is automatic.

## Files touched
- `src/pages/Auth.tsx` (deep-link condition)
- `src/hooks/useHealthKitHydrator.ts` (new)
- `src/App.tsx` (mount the hook in the authenticated shell)
- `supabase/functions/apple-health-sync/index.ts`

No database migration required.
