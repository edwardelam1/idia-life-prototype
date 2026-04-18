

## Plan: Fix /dashboard 404 — Wire MainApp Into Router

### Root Cause
`src/pages/Index.tsx` redirects onboarded users to `/dashboard`, but `src/App.tsx` has no `/dashboard` route. `MainApp.tsx` (the wallet/data/social/shop/vote/pro shell) is orphaned — never imported by any route. Result: every authenticated user lands on the 404 page.

### Changes

**`src/App.tsx`** — Add the dashboard route:
- Import `MainApp` from `@/components/MainApp`.
- Add `<Route path="/dashboard" element={<MainApp />} />` above the catch-all.

That's the entire fix. `Index.tsx` already routes correctly; it just needs the destination to exist.

### Why not change Index.tsx instead?
`/dashboard` is the semantically correct path for the authenticated app shell, and the prior plan's `/settings?tab=idia-profile` redirect from Onboarding still works because `/settings` exists. Adding the route is the right move — changing `Index.tsx` to navigate to `/` would create an infinite loop (Index lives at `/`).

### Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Import `MainApp`; add `<Route path="/dashboard" element={<MainApp />} />` |

