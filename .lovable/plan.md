# Fix: Apple sign-in spins after Face ID succeeds (iOS shell)

## What I found

- The iPhone app does its part. After Face ID it builds the Apple credential (identity token, name, email) and broadcasts it to the web page as `apple-signin:success`, a `postMessage`, `appleSignIn`, and `window.onAppleSignInSuccess`. Failures and cancels arrive as `apple-signin:error`.
- **Nothing on the web side listens for any of these.** A search of the app code finds no listener. The sign-in screen starts the web Apple redirect. The shell cancels that redirect and shows the native sheet, but the returned token is never exchanged for a session. The button keeps spinning forever.

## The fix (web only, `src/pages/Auth.tsx`)

1. **Detect the shell for Apple.** When `webkit.messageHandlers.appleSignIn` exists, post to it directly instead of calling the web redirect. That way the page never navigates away.
2. **Listen for the native result.** Add a one-time listener for `apple-signin:success` (with `window.onAppleSignInSuccess` as a fallback) and a listener for `apple-signin:error`. Clear both on success, on error, and when the component unmounts.
3. **Exchange the token.** Call `supabase.auth.signInWithIdToken({ provider: "apple", token: identityToken })`. No nonce is sent, because the shell doesn't set one on the request.
4. **Zero-PII.** If Apple returned a name or email (first sign-in only), store it in the device's Secure Storage (same as the Capacitor path) and never in the database.
5. **Never spin forever.** On an error or cancel event, or after a 60 s timeout, stop the spinner and show a toast.
6. **BEGIN/END logs** on each step, in the same `[APPLE_AUTH]` style.

No Swift changes are needed. The Google, Capacitor Apple and web Apple paths stay as they are.

## One setting to confirm

A token from the native sheet names the **app's bundle ID** as its audience, not the web Services ID. In the backend's Apple provider, the Client IDs list must include the bundle ID alongside `com.thebigidia.app`. If it's missing, sign-in will fail with a clear "audience" error toast instead of spinning. I'll check the auth logs after your first attempt.

## Verification

On your iPhone: tap Sign in with Apple, then approve Face ID. You should land in the app within a second or two. Cancelling should stop the spinner.
