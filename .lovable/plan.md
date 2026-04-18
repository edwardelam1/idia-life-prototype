
Goal: make Apple Health complete the real native flow and then land in the connected state reliably, with the modal closing only when the user actually closes it.

What I found
- The modal still has a hard 15s JS timeout. That can fire before first-run HealthKit permission + query + upload finishes, so the modal flips to error while native is still working.
- The success path is not aligned with the designed UX. It shows a transient “Sync Complete” state and then auto-closes after 2.5s instead of settling into the persistent “Apple Health Connected” area.
- The backend `apple-health-sync` function already upserts `data_connections` as active, but the modal is still relying on its own local success state plus a later parent refresh. That leaves a gap where the modal does not transition into the connected view deterministically.

Implementation plan

1. Rework the Apple Health modal success state
- Remove the transient auto-close behavior after success.
- Replace the current “connected” success screen flow with a persistent connected-state flow.
- Add local session state such as “connectedThisSession” so the modal can render the connected area immediately after the native callback succeeds, without waiting on a reopen.

2. Fix the actual timeout bug
- Replace the blind 15s timeout with a production-safe timeout strategy for native HealthKit onboarding.
- Keep stale-callback protection, but do not declare failure before the native bridge has had a realistic chance to finish first-run authorization and upload.
- Preserve explicit native error handling as the primary failure path.

3. Make the modal use the real source of truth
- Treat the backend `data_connections` update from `apple-health-sync` as authoritative.
- Refresh connection state immediately on successful native completion and use that refreshed state to drive the UI.
- Do not depend on a delayed parent rerender to decide whether the modal is “connected”.

4. Keep one close path for every exit
- Keep a single `closeAndReset()` path for X, overlay, Escape, Cancel, Close, and Done.
- Ensure no timer or stale native callback can mutate the modal after the user closes it.

5. Keep ACA handling unchanged except where required for stability
- Leave the DB-owned ACA propagation intact.
- Keep the UI limited to generating/inserting the ACA hash before handing off to native sync.

Files to update
- `src/components/AppleHealthModal.tsx` — main fix
- `src/components/DataDashboard.tsx` — pass/refetch connection state so the modal can land in the connected area immediately after a real success

Expected result
- User taps Connect.
- Native HealthKit permission/sync completes without premature timeout.
- Modal transitions into the designed “Apple Health Connected” area.
- User can close it normally with X/Close/overlay/Escape.
- Reopening the modal shows the connection as connected, not stuck or half-finished.

Validation
- Test on the iOS wrapper, not browser preview.
- Verify first-run connect takes longer than 15s without false error.
- Verify success lands in connected area.
- Verify X/overlay/Escape/Close all dismiss correctly.
- Verify reopening shows connected state and disconnect still works.
