# Session Sentinel: 30-Minute Auto-Logout + Biometric Re-Entry

Two protections for authenticated sessions:

1. **Auto-logout after 30 minutes away or idle.** If the app is backgrounded, closed, or sees no user interaction for more than 30 continuous minutes, the session is signed out and the user lands on the login screen.
2. **Biometric re-entry lock.** If the user switches to another app and comes back within the 30-minute window, the app stays signed in but is covered by a full-screen lock that requires a biological capture (Face ID / Touch ID via the native shell) before the UI is usable again.

## Behavior details

- Activity is tracked with a `lastActiveAt` timestamp persisted to `localStorage`, refreshed on pointer/key/scroll interaction and on every app foreground event.
- On foreground (`visibilitychange` visible, `focus`, and Capacitor `appStateChange`):
  - Away longer than 30 minutes → `supabase.auth.signOut()`, clear timestamps, redirect to `/auth` with a toast explaining the timeout.
  - Away any shorter amount → show the biometric lock overlay.
- While in the foreground, an idle timer also fires the same logout after 30 minutes with no interaction.
- The lock is zero-friction: on return, an opaque privacy shield covers the UI and the biometric challenge fires **automatically** — no landing screen, no "Verify Identity" button, no sign-out button.
- Verification path: the WKWebView bridge `window.webkit.messageHandlers.triggerBiologicalCapture` (same probe used by the veto gate) is invoked immediately. On success the shield disappears. On cancel/failure the challenge auto-retries once the app is interacted with or refocused; repeated failure leaves the shield in place. On web/preview, where no enclave bridge exists, the shield clears itself right away so the browser build is never locked out.
- Unauthenticated routes (`/auth`, splash, consent screens) are exempt — the sentinel only runs when a session exists.

## Technical implementation

- New `src/hooks/useSessionSentinel.ts`
  - Constants: `IDLE_TIMEOUT_MS = 30 * 60 * 1000`, storage keys `idia_last_active_at`, `idia_locked`.
  - Registers listeners: `visibilitychange`, `focus`/`blur`, `pointerdown`, `keydown`, `touchstart`, `scroll`, plus Capacitor `App.addListener("appStateChange")` when native.
  - Returns `{ locked, unlock, forceLogout }` and performs the signOut itself on expiry.
  - Granular logging in the project's existing style (`[SESSION_SENTINEL] ...`).
- New `src/components/SessionLockOverlay.tsx`
  - Full-screen glass card in the current Trust-Blue/teal styling with a fingerprint icon, status text, "Verify Identity" and "Sign Out" buttons.
  - Calls the enclave bridge and resolves through the existing biometric response listener pattern; falls back to explicit confirm on web.
- `src/App.tsx`
  - Mount a small `SessionSentinel` wrapper inside `BrowserRouter` that consumes the hook, renders `SessionLockOverlay` when `locked`, and navigates to `/auth` on logout.
  - Only active while `session` is non-null.

No database or edge function changes are needed.
