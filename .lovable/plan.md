# Fix: Apple sign-in spins after Face ID succeeds (iOS shell)

## What I found

- The iPhone app does its part: after Face ID it broadcasts the Apple credential to the page as `apple-signin:success`, a `postMessage`, `appleSignIn`, and `window.onAppleSignInSuccess`; failures arrive as `apple-signin:error`.
- **Nothing on the web side listens for any of these** — the token is never exchanged for a session, so the button spins forever. Your corrected directive confirms this and supplies the fix.

## The fix (`src/pages/Auth.tsx` only)

Per your directive, with one adaptation: your code block replaces the whole page, which would delete the email/password login, OTP password reset, and native Google sign-in. Instead I will merge your Apple logic into the existing screen, keeping everything else intact.

1. **Detect the shell for Apple.** When `webkit.messageHandlers.appleSignIn` exists, bind the listeners first, then post to the handler directly — no web redirect.
2. **Listen for the native payload.** One-time listeners for `apple-signin:success` and `apple-signin:error`, plus the `window.onAppleSignInSuccess` fallback the Swift code also calls. All listeners are removed on success, error, timeout, and unmount.
3. **Exchange the token.** `supabase.auth.signInWithIdToken({ provider: "apple", token: identityToken })`. No nonce, since the shell doesn't set one.
4. **Zero-PII.** First-sign-in name/email is sealed on-device with the existing `SecureStoragePlugin` under the app's standard `user_pii_profile` key (same as the Capacitor path) — never the database.
5. **Never spin forever.** Your 60-second dead-man switch plus cancel/error handling stop the spinner with a toast. The existing auth-state listener then routes into the app as usual.
6. **[APPLE_AUTH] BEGIN/END telemetry** at every boundary, per your spec.

The Google native path, the Capacitor Apple path (Android), the web Apple fallback, and all other sign-in methods stay exactly as they are.

## One setting to confirm

A token from the native sheet names the **app's bundle ID** as its audience, not the web Services ID. The backend's Apple provider Client IDs list must include the bundle ID alongside `com.thebigidia.app`. If it's missing, you'll now get a clear "audience" error toast instead of a spinner — I'll check the auth logs after your first attempt.

## Verification

On your iPhone: tap Sign in with Apple, approve Face ID, and you should land in the app within a second or two. Cancelling stops the spinner cleanly.
