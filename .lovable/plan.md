# Mask the Supabase OAuth URL during Apple/Google sign-in

## Goal
Replace the raw Supabase project URL (`https://zxyngqciipcvveigrzqt.supabase.co`) that users see during Apple/Google sign-in with a branded domain such as `https://auth.thebigidia.com`.

## Background
The current OAuth flow uses `supabase.auth.signInWithOAuth(...)`, which redirects the system browser/ASWebAuthenticationSession to the Supabase Auth endpoint. That endpoint lives on the default `*.supabase.co` project URL, so iOS/Android shows that URL in the consent sheet. The native Apple/Google intercept paths in `src/pages/Auth.tsx` call `signInWithIdToken` and should not show a browser URL at all; if users still see the Supabase URL on native, the native plugin is likely falling back to the web OAuth path. A Supabase Custom Domain fixes the visible URL in every case.

## Proposed subdomain
`auth.thebigidia.com` (alternative: `api.thebigidia.com`). This will be used for Supabase Auth, REST, Edge Functions, and Realtime traffic.

## Plan

### 1. Configure Supabase Custom Domain
- Open the Supabase dashboard for project `zxyngqciipcvveigrzqt`.
- Navigate to **Project Settings → Custom Domains**.
- Add `auth.thebigidia.com` as the custom domain.
- Run the verification step and add the requested DNS records.
- Wait for SSL provisioning, then activate the domain.

### 2. Update DNS
- In the DNS provider for `thebigidia.com`, add the CNAME record(s) that Supabase requests for `auth.thebigidia.com`.
- Confirm propagation before activating.

### 3. Update the app client configuration
- Replace the Supabase URL in `src/integrations/supabase/client.ts` and `.env` from `https://zxyngqciipcvveigrzqt.supabase.co` to `https://auth.thebigidia.com`.
- Keep `VITE_SUPABASE_PUBLISHABLE_KEY` unchanged.

### 4. Update OAuth provider consoles
- **Apple Developer**: Update the **Services ID / Return URLs** for `com.thebigidia.app` (or the configured Apple client ID) to include `https://auth.thebigidia.com/auth/v1/callback`.
- **Google Cloud Console**: Under the OAuth 2.0 client used by the app, add `https://auth.thebigidia.com/auth/v1/callback` to the **Authorized redirect URIs**.
- Also update any existing `*.supabase.co` redirect URIs to the new custom domain.

### 5. Update native deep links and Capacitor config
- The native OAuth fallback uses `idialife://auth-callback` as the deep-link return path in `src/pages/Auth.tsx`; this stays unchanged.
- Add `auth.thebigidia.com` to `capacitor.config.ts` `server.allowNavigation` so the in-app WebView can complete the OAuth handshake on the branded domain.
- Verify the iOS `AndroidManifest.xml` / iOS `Info.plist` custom URL schemes still route `idialife://` to the app.

### 6. Test all sign-in paths
- Web browser Google sign-in.
- Web browser Apple sign-in.
- Native iOS Apple sign-in (should use native UI; if it falls back to web, confirm branded URL).
- Native Android Google sign-in.
- Verify the deep link returns the session and the app routes to the wallet/dashboard.

## Out of scope
- Changing the `life.thebigidia.com` app custom domain (already active and unrelated).
- Moving the Supabase project to a different region or ref.

## Success criteria
- During Apple/Google sign-in, users see `auth.thebigidia.com` (or the chosen branded domain) instead of `zxyngqciipcvveigrzqt.supabase.co`.
- All existing sign-in methods continue to work after the change.
