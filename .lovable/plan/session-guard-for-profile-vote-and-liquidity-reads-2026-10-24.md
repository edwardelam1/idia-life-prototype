# Session Guard for Profile, Vote and Liquidity Reads

Goal: no read of `profiles`, `dao_votes` or `liquidity_locks` fires from the app until a signed-in, unexpired session is confirmed, so signed-out or expired page loads stop producing permission-denied (42501) noise in the shared database logs. Every guard logs a clear START/END line.

## Findings that shape the work

- `liquidity_locks` is not read anywhere in this app's frontend. Its 42501 noise comes from another caller (likely the Hub or a backend job). Nothing to guard here; called out so it is not chased in this app.
- `dao_votes` is read in `ActiveProposalsList` (vote tallies, voter list, own vote), `LifecycleTelemetry`, and `useLifeChallengeProgress`.
- `profiles` is read in governance pages (`ActiveProposalsList`, `AuditFeed`, `MotionThread`), wallet (`EnhancedWalletDashboard`, `useWalletBalance`, `useSovereignWallet`, `SeedBackupModal`, `walletService`, `vaultGuard`), `useProfile`, `useEnhancedProfile`, `useLifeChallengeProgress`, and `identityLedgerExport`.
- Health files (`AppleHealthModal`, `AndroidHealthModal`, `DataSourceModal`, `healthService`) also read `profiles` — excluded under NEVER TOUCH HEALTH unless you say otherwise.

## What will change

1. **One shared guard** `requireActiveSession(tag)` in `src/lib/authUser.ts` (next to the existing cached-user helper):
   - Logs `[UI_AUTH_GUARD][START] <tag>`.
   - Reads the local session; returns null if missing or `expires_at` is in the past (one silent refresh attempt first, using the existing single auth listener — no extra network chatter).
   - Logs `[UI_AUTH_GUARD][END] <tag> status=ACTIVE|NO_SESSION|EXPIRED`.
   - Returns the user only when ACTIVE.
2. **A hook form** `useActiveSession()` for components: exposes `{ user, authLoading }`, driven by the same auth listener, so effects can `if (authLoading || !user) return;` and re-run once sign-in resolves.
3. **Apply the guard at every listed read** (excluding health files): each query block starts with the guard and returns early with no query when the session is not active. Governance effects that currently fire on mount (public tallies/voter lists in `ActiveProposalsList`, `AuditFeed`, `MotionThread`, `LifecycleTelemetry`) wait for `authLoading` to settle and a user to exist.
4. **Realtime subscriptions** on these tables subscribe only after the session is active and unsubscribe on sign-out.

No database, permission or policy changes. No visual changes — signed-in users see exactly what they see today; signed-out loads simply show their existing empty/loading state.

## Verification

- Load the Gov, Wallet and Life pages signed out in the browser: console shows `[UI_AUTH_GUARD][END] ... NO_SESSION` and the network log shows zero requests to `profiles` / `dao_votes`.
- Typecheck and build pass. Signed-in flows need a check on your device (signed-in browser testing isn't available for this project).

## Technical details

- Guard placement: before each `supabase.from("profiles"|"dao_votes")` call; hooks gate their `useEffect` on `[user?.id, authLoading]`.
- Expiry check: `session.expires_at * 1000 > Date.now() + 30_000` (30s skew buffer).
- Keeps existing `getCachedUser` callers working; the new helper wraps it rather than replacing it.
