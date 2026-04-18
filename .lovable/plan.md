

## Root Cause

The Apple Health edge function works (logs confirm `✅ DELT anchor minted`, data flows to `staged_health_data`). The **modal UI never transitions to "connected"** because it depends entirely on the iOS native bridge invoking `window.onHealthDataSyncComplete(...)` after the sync. If the Swift wrapper doesn't fire that JS callback (or fires it under a different name, or posts before the listener is attached), the 15s timeout fires → "Native bridge timeout" error, even though the DB write succeeded.

## Fix: Add Server-Side Confirmation Fallback

Make the modal **self-confirming** by polling `data_connections` for a fresh `last_sync_at`. The edge function already upserts `data_connections` (`is_active: true`, `last_sync_at: now()`) on every successful sync, so we have a reliable signal independent of the native callback.

### Changes to `src/components/AppleHealthModal.tsx`

1. **Capture `syncStartedAt`** when `handleConnect` fires.
2. **After firing the native bridge**, start a poll loop (every 2s, max 20s) querying `data_connections` for `connection_type='apple_health'` where `last_sync_at > syncStartedAt`.
3. If poll succeeds first → synthesize a `serverResponse` (`{ processed_count: 0, processed_data: [] }`) and call the same `syncCompleteHandler` path so the UI flips to "connected".
4. If native callback fires first → cancel the poll (already handled by clearing timeout).
5. **Extend native timeout from 15s → 25s** so the poll has room.
6. Clear the poll on unmount / status change.

### Why this is safe

- Native callback path stays intact for users on properly-built iOS app.
- Web/PWA users and any iOS build where the JS bridge callback fails now succeed gracefully.
- No DB writes from client; just a read.
- Sync count shows "0 records (verified server-side)" when polled — distinguishes paths.

### Files Modified

| File | Change |
|------|--------|
| `src/components/AppleHealthModal.tsx` | Add `data_connections` polling fallback after native bridge call; extend timeout to 25s |

