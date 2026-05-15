## Goal
Intercept Apple Sign-In PII natively on-device, seal it in Secure Enclave via `SecureStoragePlugin`, authenticate with Supabase via `signInWithIdToken` (zero PII to backend), and pre-fill the Onboarding form from the sealed payload.

## Changes

### 1. Install dependency
- `@capacitor-community/apple-sign-in` (already have `capacitor-secure-storage-plugin` — verify; install if missing).

### 2. `src/pages/Auth.tsx` — `handleOAuthSignIn`
- Branch when `provider === "apple"` AND `Capacitor.isNativePlatform()`.
- Call `SignInWithApple.authorize({ clientId: 'com.thebigidia.app', redirectURI: window.location.origin + '/', scopes: 'email name' })`.
- If `result.response.email || givenName`, write JSON `{first_name,last_name,email,phone:""}` to `SecureStoragePlugin` under key `user_pii_profile`.
- Authenticate via `supabase.auth.signInWithIdToken({ provider: 'apple', token: result.response.identityToken })`.
- Web + Google path unchanged (existing `signInWithOAuth`).
- Confirm `clientId` = `com.thebigidia.app` is correct (matches Apple Service ID configured in Supabase).

### 3. `src/pages/Onboarding.tsx` — pre-fill effect
- Add `useEffect` (gated on existing auth-check flag) that reads `SecureStoragePlugin.get({ key: "user_pii_profile" })`.
- On hit, parse JSON and call existing setters (`setFirstName`, `setLastName`, `setEmail`, `setPhone`) for any non-empty fields.
- Swallow errors (missing key is normal for email/password users).
- Need to view current Onboarding.tsx to confirm exact state setter names + the auth-check flag name (the user wrote `authChecked`; current code may differ).

### 4. Verification
- Type-check passes.
- Web flow: Apple branch is skipped (non-native) → no regression.
- Manual native test deferred to user (requires Xcode build).

## Open questions
- Confirm Apple Service ID is `com.thebigidia.app` (matches what's configured in Supabase Auth → Apple provider). If different, I'll use the correct one.
- Confirm we should keep the sealed payload after onboarding completes, or delete it post-prefill. Current spec doesn't say — I'll leave it (Onboarding can clear it after submit if desired later).
