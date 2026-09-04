# Fix Apple Health Anchoring — React + Database Only

Swift is out of scope and will not be touched.

## What the data proves

- Your device successfully delivered health data earlier today: 128 rows at 12:38 UTC and 16 rows at 13:08 UTC, each under its own consent hash. The native shell therefore posts correctly.
- Since then, every connect attempt mints a **new consent record** (14:17, 14:39, 14:52, 14:53, 14:56, 14:58, 14:59, 15:06, 15:10, 15:13, 15:23, 15:33, 15:40, 15:43, 16:08) but **no health payload follows** any of them.
- Your profile has **zero `apple_health` rows in `data_connections`** — so even the modal's realtime/poll safety net has nothing to observe, and it spins forever.
- The web layer currently tells the device to fetch **an empty set of data types**: the modal keeps a `selectedDataTypes` set with all 16 HealthKit identifiers checked, but the bridge message sends `requestedDataTypes: {}`. Nothing is requested, so nothing is gathered and nothing is posted — which matches "the edge function is never called."

## Fix

### 1. Send the real requested types (React)
In the Apple Health modal, build the requested-types payload from the user's actual selections instead of an empty object, and send it in the shape the native shell has always consumed: a map keyed by HealthKit identifier with a boolean value, alongside an array of the same identifiers for tolerance. Block the dispatch with a clear message if the user has deselected everything, rather than sending an empty request.

### 2. Stop minting a throwaway consent record per tap (React + DB)
Reuse the existing active `apple_health` consent artifact for this platform identity when one is present, and only mint a new one when none exists. This keeps the consent ledger clean and guarantees the hash sent to the device is the same one already anchored in the database.

### 3. Make the modal recover on its own (React)
- Seed the `apple_health` row in `data_connections` (inactive, no sync stamp) at the start of a connect attempt so the realtime subscription and poll fallback have a row to watch; the sync itself flips it active.
- Give the connect flow a bounded wait with an explicit, readable failure state instead of an endless "Anchoring cryptographic proof" spinner, reporting whether the consent anchor, the device fetch, or the ingest step stalled.

### 4. Confirm with hardware only
No synthetic requests, pings, or fabricated payloads. Verification is one connect attempt from your iPhone, checked against: a new ingest under the reused consent hash, an active `apple_health` connection row with a fresh sync timestamp, and the modal closing on its own.

## Technical notes

- Files touched: `src/components/AppleHealthModal.tsx` only, plus a data write to seed/repair the `data_connections` row for the affected profile.
- The edge function stays as-is; its logs show it responds correctly whenever it is actually called.
- No schema changes and no Swift changes.
