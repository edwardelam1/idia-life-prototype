## Diagnosis

After a successful Apple/Google auth handshake, Supabase persists the session — but on the next mount (or the reload triggered by the OAuth return), `App.tsx` runs a "session guard" that treats **any HS256-signed access token** (tokens beginning with `eyJhbGciOiJIUzI1NiI`) as a legacy/compromised token and immediately calls `supabase.auth.signOut({ scope: 'local' })` followed by `window.location.reload()`.

Supabase's default access-token signing algorithm for this project is HS256, so **every legitimate session** matches that "legacy" pattern. Result:

1. User completes Apple/Google auth → session lands in local storage.
2. `Auth.tsx` `onAuthStateChange` fires → navigates to `/`.
3. `App.tsx` re-mounts on `/` → guard sees HS256 token → purges the session → reloads.
4. Reload lands on `/` with no session → `Index.tsx` renders `LandingScreen` (splash is correctly suppressed by the earlier fix, so the user just sees the slides).

This matches exactly what the user is reporting: "capturing my authentication" but ending on the slide screen instead of the wallet.

## Fix

Remove the HS256 "legacy token" purge in `src/App.tsx`. That heuristic was written for a one-time JWT-secret rotation event and is now indiscriminately signing every user out. Keep the rest of the session bootstrap intact (`getSession`, `onAuthStateChange`, deep-link handling).

### Change

**`src/App.tsx`** — delete the `AUTH_SESSION_GUARD` block (lines ~53–67) that:
- Reads the session,
- Flags any token starting with `eyJhbGciOiJIUzI1NiI` as legacy,
- Calls `signOut({ scope: 'local' })` and `window.location.reload()`.

Leave everything below it (the normal `getSession().then(...)`, `onAuthStateChange` subscription, and deep-link listener) unchanged.

## Verification

- Sign in with Apple → should route straight into `MainApp` (wallet tab).
- Sign in with Google → same.
- Email/password sign in → same.
- Refresh while signed in → stays signed in, no forced reload loop.
