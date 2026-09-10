# Apple Health: don't mark connected until HealthKit access is actually granted

## The problem

Today, as soon as the Face ID consent artifact is created, the Apple Health screen writes the connection as **active** and flips the UI to "Connected" — before the iPhone's Health permission sheet has been answered. If you tap "Don't Allow", the source still shows as a live connection even though no data can ever flow.

## What changes

Only the Apple Health screen's own logic changes. No changes to the iOS native shell, the Health sync server function, or any other data source.

1. **Consent first, activation last.** The connection row is created/updated as **inactive** right after the consent step, and only flipped to active when the phone reports a real, successful read.
2. **Denied access ends the flow immediately.** If the native layer reports an error or a permission refusal, the screen stops, sets the connection back to inactive, shows "Apple Health access was not allowed — no data can be synced", and closes the source out instead of leaving it listed as connected.
3. **No premature success.** The instant "resolve the UI immediately" call is removed; the connected state now comes only from the existing confirmation paths — the native success callback, the realtime watcher, or the ledger poll, all of which require a real active row.
4. **Bounded waiting.** If neither an approval nor a refusal arrives within the existing timeout window, the screen reports the stall and leaves the connection inactive rather than active.
5. **Cancel/close cleanup.** Closing the screen while a never-confirmed attempt is in flight leaves no active Apple Health row behind.

## Technical detail

In `src/components/AppleHealthModal.tsx`:

- In `handleConnect`, change the `data_connections` seed (insert and update branches) to `is_active: false` and drop the premature `last_sync_at`; keep the existing select-then-insert/update pattern (no upsert).
- Remove the direct `handleLedgerVerification()` call that fires right after `syncHealthDataViaNativeApp(...)`; keep the watchdog timer running through the native handoff instead of clearing it beforehand.
- Add a `deactivateConnection()` helper that selects the user's `apple_health` row and updates `is_active: false`; call it from `onHealthDataSyncError`, from the watchdog timeout, and from `closeAndReset` when the session never reached `connected`.
- In `onHealthDataSyncComplete`, flip the row to `is_active: true` with `last_sync_at`, then call `handleLedgerVerification()` so the confirmed state is the only route to "Connected".
- Treat error text containing denial wording (`denied`, `not allowed`, `authorization`, `unauthorized`) as a hard refusal: message "Apple Health access was not allowed — no data can be synced", status `error`, connection deactivated, no retry loop.
- The realtime channel and 3.5s poll already require `is_active === true`, so they now only fire after genuine confirmation; no change needed there.
