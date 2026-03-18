

# Fix Password Reset Flow End-to-End

## Problem
The build fails because `"PASSWORD_RECOVERY"` is not a valid `AuthChangeEvent` in the current Supabase JS SDK (v2.50+). The valid events are: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `MFA_CHALLENGE_VERIFIED`.

Additionally, the reset email `redirectTo` URLs are inconsistent between the edge function and client code.

## Solution

### 1. Fix `src/pages/Auth.tsx` -- Remove PASSWORD_RECOVERY check
Since `PASSWORD_RECOVERY` no longer exists as an auth event in the current SDK, the password recovery flow must work differently:
- When a user clicks the reset link in their email, Supabase redirects them to the app with a recovery token in the URL hash
- The `redirectTo` in `resetPasswordForEmail` should point to `/update-password` (web) or `idialife://update-password` (native)
- Remove the `showUpdateModal` state and the inline "Set New Password" UI block from Auth.tsx entirely -- the dedicated `UpdatePassword` page handles this
- In the `onAuthStateChange` listener, simply navigate to `/` on `SIGNED_IN` events, but skip navigation if the current path is `/update-password` (so the user can finish resetting)

### 2. Fix `redirectTo` in `handlePasswordReset`
- For web: `${window.location.origin}/update-password`
- For native (Capacitor): `idialife://update-password`
- Use a simple platform check: if running in Capacitor, use the deep link scheme; otherwise use the web URL

### 3. Update the `reset-password` edge function
- Update the `redirectTo` to point to the web URL for the update-password page consistently
- Fix CORS headers to include the full set of Supabase client headers

### 4. Ensure `UpdatePassword.tsx` handles the token
The existing `UpdatePassword.tsx` already calls `supabase.auth.updateUser({ password })` which is correct. Supabase auto-picks up the recovery session from the URL hash. No changes needed here.

## Technical Details

**Auth.tsx changes:**
- Remove `newPassword`, `showUpdateModal`, `isUpdatingLoading` state variables
- Remove the `handleUpdatePassword` function
- Remove the `if (showUpdateModal)` UI block
- Replace the `onAuthStateChange` listener: on `SIGNED_IN`, check `window.location.pathname !== '/update-password'` before navigating to `/`
- Change `redirectTo` in `handlePasswordReset` to `${window.location.origin}/update-password`

**Edge function changes:**
- Update `redirectTo` to use the project's published URL + `/update-password`
- Add full CORS headers

**Files to modify:**
- `src/pages/Auth.tsx`
- `supabase/functions/reset-password/index.ts`

