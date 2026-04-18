
Fix the Apple Health modal by treating it as a single, cancellable sync session instead of a component with long-lived global callbacks.

What’s actually racing now:
- The modal is parent-controlled (`isOpen`), but `AppleHealthModal` keeps native callbacks and timers alive for the full component lifetime.
- A late native callback or auto-close timer can still run after the user closes/cancels, which re-mutates modal state and makes it feel stuck or inconsistent.
- `Dialog onOpenChange={onClose}` is too loose for a controlled dialog. It should explicitly handle only the close transition.
- The Apple Health bridge payload is still nested under `config`, but project memory says the iOS wrapper expects flat root keys. That can prevent the native completion callback from arriving reliably, leaving the modal hanging in “connecting”.

Implementation plan

1. Harden `src/components/AppleHealthModal.tsx`
- Add a dedicated `closeAndReset()` function that:
  - clears all timeout refs
  - invalidates the active sync session
  - resets `connectionStatus`, `isConnecting`, `errorMessage`, `healthData`, `syncCount`, and success flags
  - then calls parent `onClose`
- Add a `syncSessionIdRef` (or request token) so only the current sync is allowed to update state.
- Make every async path check that the callback still belongs to the active session before setting state.
- Store the auto-close timer in a ref and clear it on close/unmount.
- Reset modal state whenever `isOpen` becomes `false`, so stale success/error state never survives into the next open.

2. Fix the controlled dialog wiring
- Replace `onOpenChange={onClose}` with an explicit handler:
  - if `open === false`, run `closeAndReset()`
- Route the top-right X, Cancel button, overlay close, and Escape key through the same `closeAndReset()` path so every exit path behaves identically.

3. Fix the native bridge contract
- Change the `webkit.messageHandlers.syncHealthData.postMessage(...)` payload to the flat structure required by the iOS bridge:
  - `action`
  - `endpoint`
  - `user_id`
  - `auth_token`
  - `aca_hash`
  - `requestedDataTypes`
  - `sync_session_id`
- Return/use the same `sync_session_id` in the JS callback handling and ignore stale completions/errors from older sessions.

4. Clean up callback registration timing
- Only register `window.onHealthDataSyncComplete` / `window.onHealthDataSyncError` while the modal is open or a sync is active.
- Remove them immediately on close/reset, not just on component unmount.

5. Align ACA insert with the new DB-owned propagation
- In `AppleHealthModal`, stop sending `source_id` in `user_aca_records` unless the Apple flow truly requires it.
- Let the DB trigger stamp/propagate it, keeping the UI responsible only for generating the ACA hash.

Files to update
- `src/components/AppleHealthModal.tsx` — main race-condition fix
- `src/components/DataDashboard.tsx` — only if a small parent close-handler cleanup is needed

Expected result
- The modal closes reliably from X, overlay, Escape, Cancel, and Done.
- No stale native callback can reopen or mutate a closed modal session.
- Apple sync completion is reliable because the bridge payload matches the iOS contract.
- ACA flow remains production-safe: UI generates the hash, DB propagates it.

Technical notes
- This is not just a visual close bug; it’s a lifecycle bug caused by mixing:
  1. controlled dialog state,
  2. global window callbacks,
  3. multiple timers,
  4. async native completion,
  5. no request/session invalidation.
- The safest production fix is session-token gating + single-path close/reset + flat native bridge payload.
