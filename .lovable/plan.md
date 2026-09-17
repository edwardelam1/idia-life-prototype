# Wire HealthKit listeners into the React UI + lift throttles for testing

The Swift shell now emits `health:sync-start`, `health:sync-complete` and `health:sync-error` window events from its background HealthKit process. The React side does not listen for them yet, and the local throttles (5-minute wake cooldown + server 6-hour freshness window) block rapid back-to-back sync testing.

## Changes

### 1. New hook — `src/hooks/useAppleHealthBridge.ts`
Create exactly per the spec:

- Listens on `window` for `health:sync-start`, `health:sync-complete`, `health:sync-error`.
- `health:sync-start` → `healthStatus = 'Refreshing...'`.
- `health:sync-complete` → `event.detail?.status === 'throttled' ? 'Idle (Throttled)' : 'Up to Date'`.
- `health:sync-error` → `'Error'`.
- Initial state `'Idle'`, `[HEALTH_BRIDGE_LOG]` console lines on mount and on each event.
- Returns `{ healthStatus }`; all three listeners removed on unmount.

No data pipeline, edge function, or Swift code is touched.

### 2. Apply `healthStatus` to the Apple Health row — `src/components/DataDashboard.tsx`
- Import and call `useAppleHealthBridge()`.
- In the Active Streams carousel, when the connection is `apple_health` (iOS path) and `healthStatus` is not `Idle`, the sync badge under the Apple Health icon shows the live bridge state instead of the database status: label = `healthStatus` ("Refreshing…", "Up to Date", "Idle (Throttled)", "Error").
  - Colors: Refreshing → blue/amber pulsing, Up to Date → green, Idle (Throttled) → amber, Error → red.
  - When `healthStatus` is `Idle`, the existing `renderSyncBadgeFor` database badge is shown unchanged.
- The popover, click-through-to-modal behavior, and all other sources' badges are untouched.

### 3. Disable local throttles for testing — `src/hooks/useSourceWakeRefresh.ts`
- Default `cooldownMs` changes from `5 * 60 * 1000` to `10 * 1000` (10 seconds), with a `// TEMP: testing throttle removed — restore to 5 min` comment so it is easy to find and revert.
- `body: { respect_freshness: false }` is already in place from the previous change — verified, no edit needed; the plan only confirms it stays strictly `false`.

Both throttle lifts are explicitly temporary test settings; the comment marks the cooldown for restoration after device testing.

## Verification
- Type check passes; build OK.
- Playwright: Data screen renders, Apple Health badge falls back to the database status in the browser (no native events on web), no console errors from the new listeners.
- Real device: opening the app twice within 10 seconds triggers two full refreshes; a Swift background sync flips the Apple Health badge through Refreshing → Up to Date.
