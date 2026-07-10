## Plan: Handle `IDIA_AUTH_CANCELLED` from iOS Native Shell

### Context
- The iOS native shell now posts `window.postMessage({ type: 'IDIA_AUTH_CANCELLED' }, '*')` when the `ASWebAuthenticationSession` is cancelled or fails.
- Currently the only `IDIA_AUTH_*` message listener is in `src/components/enhanced/EnhancedWalletDashboard.tsx` and it only handles the success path (`IDIA_AUTH_COMPLETE`).
- The login screen (`src/pages/Auth.tsx`) sets `isLoading = true` while a native OAuth sign-in is in progress, and that state is never cleared if the user cancels the system sheet.

### Changes

1. **Add a message listener in `src/pages/Auth.tsx`**
   - Add a `useEffect` that registers `window.addEventListener('message', ...)` on mount and removes it on unmount.
   - The handler checks `event.data?.type`:
     - `IDIA_AUTH_CANCELLED` → set `isLoading` to `false`, optionally show a non-blocking toast like "Sign-in was cancelled".
     - `IDIA_AUTH_COMPLETE` → set `isLoading` to `false` (defensive, the existing auth-state listener already handles the actual session).

2. **Update the existing listener in `src/components/enhanced/EnhancedWalletDashboard.tsx`**
   - Extend the same `handleNativeAuthMessage` callback to also recognize `IDIA_AUTH_CANCELLED` and, for completeness, no-op or log it.

### Files to edit
- `src/pages/Auth.tsx`
- `src/components/enhanced/EnhancedWalletDashboard.tsx`

### Acceptance criteria
- When the user cancels the iOS `ASWebAuthenticationSession`, the login screen buttons become enabled again (no infinite loading state).
- No duplicate listeners or memory leaks after navigation.
- The success path (`IDIA_AUTH_COMPLETE`) remains unaffected.