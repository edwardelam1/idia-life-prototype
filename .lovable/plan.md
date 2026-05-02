## White Screen Root Cause

The new centralized notification system has a runtime bug that crashes the app on every authenticated route.

In `src/stores/notificationStore.ts`, `subscribe()` returns the result of `Set.delete()` (a boolean) instead of a cleanup function:

```ts
subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener); // returns boolean, not void
},
```

Wait — actually the arrow returns a boolean from inside a function, so the cleanup itself *is* a function. The real issue is different: `useSyncExternalStore` re-invokes `subscribe` and `getSnapshot` aggressively, and `getSnapshot` returns the live mutable `items` reference. Each `add()`/`markAllRead()`/`clearAll()` reassigns `items` to a new array, which is correct — BUT the initial snapshot is captured before any mutation, and React compares references with `Object.is`. That part works.

The actual crash is that `<NotificationBell />` is rendered inside `<Header />`, and the `Popover` from Radix is mounted on initial render. Combined with the sonner `<Toaster />` in `App.tsx` and the new `notify()` shim, anything that calls the legacy `useToast()` or `toast()` paths during boot will crash if the shim wiring is incomplete.

I need to verify by reading `src/components/ui/sonner.tsx`, `src/components/ui/toaster.tsx`, and `src/hooks/use-toast.ts` (the shimmed versions) before locking in the fix. The plan below covers the most likely failures based on the code already inspected.

## Fixes

### 1. `src/stores/notificationStore.ts`
Make `subscribe` return a proper `() => void` cleanup (not the boolean from `Set.delete`):
```ts
subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
},
```
This is required by React's `useSyncExternalStore` contract.

### 2. Audit and repair the notification shims
Read the rewritten `src/components/ui/sonner.tsx`, `src/components/ui/toaster.tsx`, and `src/hooks/use-toast.ts`. Confirm:
- They still export the symbols their existing call sites import (`Toaster`, `toast`, `useToast`, `toast.success`, `toast.error`, etc.).
- They don't import from `@/lib/notify` in a circular way (notify imports sonner; if sonner re-imports notify it will deadlock the module graph and produce a white screen).
- The legacy `useToast()` return shape (`{ toast, dismiss, toasts }`) is preserved.

Fix any broken exports or circular imports found.

### 3. Verify `App.tsx` only mounts one toast surface
`App.tsx` currently mounts `<Sonner />` from `@/components/ui/sonner`. Confirm `<Toaster />` (radix) isn't double-mounted somewhere causing duplicate portal IDs.

### 4. Re-test
After the fix, hard-reload the preview and confirm:
- `/auth` renders the login form (unauthenticated path — should already work, the screenshot session shows the user reaching `/auth`).
- After login, `/` mounts `Header` → `NotificationBell` without throwing.
- Triggering a `notify.success(...)` from anywhere appends to the bell dropdown and shows a sonner pill.

## What this does NOT change

- No schema changes.
- No native (iOS/Android) plugin changes.
- The pre-existing TS errors in `useProfile.ts` / `useEnhancedProfile.ts` (PII columns typed as `never` by the zero-PII Supabase types) are intentional guardrails and stay as-is.

Approve to apply the fix.