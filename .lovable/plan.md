## Remove Sovereign Onboarding Page

The `/onboarding` route is forcing post-auth users into a PII-capture form that breaks the landing → app flow. Remove the page and every redirect that points at it. PII capture already happens natively (Auth page writes `user_pii_profile` from Apple Sign-In) and via Settings, so this page is redundant.

### Changes

**1. `src/pages/Index.tsx`** — drop the PII gate
- Remove `piiChecked` state, the `SecureStoragePlugin` import, and the `useEffect` that calls `SecureStoragePlugin.get('user_pii_profile')` and redirects to `/onboarding`
- Remove the `if (!piiChecked) return <spinner/>` block
- After auth, render `MainApp` directly

**2. `src/App.tsx`**
- Remove the `import Onboarding from "./pages/Onboarding"`
- Remove the `<Route path="/onboarding" ... />` line

**3. `src/pages/RecoveryPhrase.tsx`**
- In `handleComplete`, replace the `navigate("/onboarding", ...)` branch with `navigate("/", { replace: true })` so post-backup users land in the app

**4. `src/pages/Onboarding.tsx`**
- Delete the file

### Untouched (intentional)
- `SecureStoragePlugin` reads of `user_pii_profile` in `useSecureProfile`, `notificationHydrator`, `PrivacySettings`, and `Auth.tsx` — these consume PII that's written natively or via Settings and don't depend on the onboarding page
- `OnboardingModal` (wallet/FBO provisioning modal) — unrelated to the PII page
- No backend, RLS, or edge-function changes