# Move Sovereign Auth to Pro Tab Entry

**STRICT BOUNDARY**: Edits limited to `src/components/pro/ProScreen.tsx` and `src/components/pro/PureAlphaDashboard.tsx`.

## New flow

```text
Pro icon (menu) → SovereignAuth → ProPaywall (if no tier) → Tier dashboard
```

Previously SovereignAuth ran inside `PureAlphaDashboard` (only Pure Alpha subscribers ever saw it). It now gates the entire Pro tab — every user sees the auto-unlock vault sequence the moment they tap Pro on the bottom nav, before paywall or any dashboard.

## Changes

### 1. `src/components/pro/ProScreen.tsx`
- Add `useState` for `authVerified` (default `false`).
- Import `SovereignAuth`.
- After the `loading` check and before the `!tier` paywall check, render:
  ```tsx
  if (!authVerified) {
    return <SovereignAuth onVerified={() => setAuthVerified(true)} />;
  }
  ```
- Rest of the tier-switching logic unchanged.

### 2. `src/components/pro/PureAlphaDashboard.tsx`
- Remove the `import SovereignAuth from "./SovereignAuth";` line.
- Remove the `authVerified` state and its setter.
- Remove the render guard `if (!authVerified && !isMasked) return <SovereignAuth ... />;`.
- Remove `authVerified` from the data-fetching `useEffect` dependency array; replace the `if (isMasked || !authVerified) return;` early-return with `if (isMasked) return;`.

Pure Alpha users now reach the dashboard directly because SovereignAuth already ran at the tab level.

## Behavior notes

- Auth state is per-mount of `ProScreen`. Leaving the Pro tab and returning re-runs the vault sequence — matches the "every entry to Pro" intent.
- No nav, header, or other tab changes. Paywall and tier dashboards are untouched aside from the removed Pure Alpha gate.

## Out of scope

- No changes to `SovereignAuth.tsx` itself.
- No changes to `useSubscription`, paywall pricing, or tier logic.
- No persistence of the verified state across app sessions.
