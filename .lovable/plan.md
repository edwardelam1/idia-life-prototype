

# Fix DataDashboard.tsx Build Errors

## Problem
The file has two issues:
1. **Line 63**: A JSX comment `{/* STRICT NO-SCROLL LOCK */}` sits outside the root JSX element — it's between `return (` and the `<div>`, which is invalid JSX syntax.
2. **Line 138**: `onConsent` prop is passed to `DataSourceModal`, but the component's interface doesn't accept that prop.

Additionally, `onComplete` needs to be optional since `MainApp.tsx` renders `DataDashboard` without passing it.

## Fix

**`src/components/DataDashboard.tsx`:**
- Move the comment inside the root `<div>` element
- Make `onComplete` optional in the interface
- Remove `onConsent` prop from `DataSourceModal` (not in its interface) and instead use `onClose` with a wrapper that calls `handleConsentGiven`

Since the modal doesn't have an `onConsent` prop, the consent/connection tracking needs to be handled differently. Looking at the modal, it manages its own consent flow internally. We'll keep the user's original code structure but fix the syntax issues — the `onConsent` call will need to be removed since the modal doesn't support it. We can add an `onConsent` prop to the modal's interface instead to preserve the user's intended behavior.

**Changes:**
1. Line 63: Move comment inside the `<div>` or remove it
2. Line 8: Make `onComplete` optional (`onComplete?: () => void`)
3. Add `onConsent` to `DataSourceModal`'s props interface and wire it up

