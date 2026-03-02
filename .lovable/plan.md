

# Fix Build Errors: Create UpdatePassword Page

## Problem
Two build errors exist:
1. `src/pages/UpdatePassword.tsx` is imported in `App.tsx` but doesn't exist
2. `@capacitor/app` import error (likely a transient issue since it's in dependencies)

## Solution

### Create `src/pages/UpdatePassword.tsx`
A password reset page with:
- A form with a single password input field (min 6 characters)
- Lock icon header with "Set New Password" title
- Calls `supabase.auth.updateUser({ password })` to update the password
- On success, shows a toast and redirects to `/auth` after 1.5 seconds
- Loading state with spinner during submission
- Styled consistently with the app's existing auth page design (centered card, gradient background)

The component relies on the deep link handler in `App.tsx` which passes the Supabase recovery token via the URL hash fragment, so `supabase.auth.updateUser` already knows the authenticated user context.

No other file changes needed -- the route and import in `App.tsx` already exist.

