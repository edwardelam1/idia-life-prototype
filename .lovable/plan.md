# Fix "Sign in with Google" on iOS leaving the user stuck in the popup

## What's happening

On iOS, the Apple button uses the native sign-in sheet and hands the token straight back to the app, so it works. The Google button is supposed to do the same through the native Google plugin, but that native path is not usable in the iOS build (no iOS Google client is configured for it), so the code silently falls into a web fallback: it hands the sign-in off to a browser window. That window completes the login inside itself and shows the dashboard there, while the real app window never receives the session and stays signed out.

## The fix

Two layers, so Google behaves exactly like Apple and can never strand the user again.

### 1. Make Google use the native sheet on iOS (primary path)

- Add the iOS Google OAuth client to the Capacitor config and pass it explicitly when initializing the plugin on iOS, keeping the existing web/server client for Android and token verification.
- On success the flow is unchanged from today: seal name/email in the Secure Enclave, exchange only the ID token with Supabase, no PII in the database.
- Native shell requirement (outside the web code): the iOS project needs the Google client ID and its reversed-client-ID URL scheme registered. I will list the exact values to add once you provide the iOS OAuth client ID from Google Cloud (the Apple flow needs no equivalent, which is why only Google is affected).

### 2. Make the fallback return to the app instead of stranding it

If the native sheet is unavailable for any reason, the fallback must not navigate a window into a logged-in dashboard:

- Request the provider URL without auto-redirecting the current window, then open it in the system auth browser sheet with a return target of `idialife://auth-callback`.
- Extend the existing deep-link handler so it accepts both response shapes — token fragment and authorization code — establishing the session in the main app window and then closing the browser sheet.
- Show a clear failure toast and reset the button if the sheet is dismissed without a session, rather than leaving a spinner.

### 3. Verification

- Confirm the built app logs the native Google path (not the fallback) on iOS.
- Confirm the browser sheet closes and the main window lands on the post-auth route with an active session.
- Confirm Apple sign-in, email/password sign-in, and the consent/age gates are unchanged.

## Technical notes

- `src/pages/Auth.tsx`: add `iosClientId` handling in `GoogleAuth.initialize`, and rewrite the `else` fallback branch to use `signInWithOAuth({ skipBrowserRedirect: true })` plus `@capacitor/browser` on native.
- `capacitor.config.ts`: add `iosClientId` under the `GoogleAuth` plugin block.
- `src/App.tsx`: in the `appUrlOpen` handler, also parse `?code=` and call `exchangeCodeForSession`, and call `Browser.close()` after the session is set.
- No database, edge function, or Supabase auth-provider configuration changes are required.

## Open item

I need the iOS Google OAuth client ID (from Google Cloud, type "iOS", bundle `com.idiadata.LovableHealthWrapper`). Without it, only step 2 can ship — Google would work but through the browser sheet rather than the native sheet.
