# Fix the 30-second biometric stall and the maxed-out database I/O

Two separate problems are stacking on top of each other: the app locks itself behind a Face ID challenge on *cold* launch (which shouldn't happen at all), and the database is being hammered by duplicate cron jobs, unindexed health queries, and 1.9 GB of accumulated internal log bloat.

## 1. Biometric shield no longer fires on cold launch

Today the sentinel runs its "returning from background" evaluation once at mount. On a fresh launch the stored timestamp is always older than 1.5 seconds, so every launch pops the lock shield and the user waits for Face ID before the wallet renders. If the bridge is slow or the challenge is dismissed, the shield can sit there indefinitely.

Changes in `src/hooks/useSessionSentinel.ts`:
- Treat the first evaluation as a cold boot: if the stamp is older than 30 minutes, sign out as today; otherwise just re-stamp and do **not** lock. Biometrics only re-arm on a real background → foreground transition after the app has been running.
- Ignore duplicate foreground events fired within a couple of seconds of one another (visibilitychange + focus + Capacitor appStateChange all fire together today).

Changes in `src/components/SessionLockShield.tsx`:
- Add a fail-open timeout: if the native bridge does not answer within ~12 seconds, clear the shield instead of leaving the user on a spinner (the session is still valid; the idle rule still governs logout).
- Stop re-firing the challenge on every `focus` event — the Face ID sheet itself causes focus churn, which currently re-triggers the challenge in a loop.

## 2. Cut the database write/read storm

Verified from live database stats:

- `idia-event-indexer` runs **every 30 seconds**; it drives 270,000+ cursor reads and writes and 97,000+ `egress_logs` scans.
- Duplicate jobs are running the same work twice: two `maintain_real_time_signals()` heartbeats every minute, two `auto_promote_pending_veto()` jobs, and `dao-timelock-sweep` scheduled both every minute and every 15 minutes.
- `mint-liability-receipt` runs every minute and scans `egress_logs` with no supporting index.

Plan (via migration):
- Unschedule the duplicate heartbeat, duplicate auto-promote, and the every-minute `dao-timelock-sweep` (the 15-minute one stays).
- Slow `idia-event-indexer` to every 2 minutes and `mint-liability-receipt` to every 5 minutes. Nothing in the UI depends on sub-minute freshness.

## 3. Add the missing indexes

- `staged_health_data` has **2.18 million sequential scans** and no index on `user_id`. Add `(user_id, processed_at DESC)` and `(created_at DESC)`.
- `egress_logs`: add a partial index matching the minting query — rows where `nft_minted` is null/false and `settled_at` is set, ordered by `settled_at`.
- `wallets`: the address lookup uses a case-insensitive match with no index — add a `lower(wallet_address)` index.

Trade-off: indexes make these reads dramatically cheaper at the cost of a small amount of storage and slightly slower writes on those tables.

## 4. Reclaim the disk bloat driving I/O

- `net._http_response` is **1130 MB** holding only 2,813 live rows — every cron HTTP call's response body is retained. Purge rows older than one hour and add a small hourly cleanup job.
- `cron.job_run_details` is **798 MB**. Purge entries older than 7 days and keep them trimmed hourly.

Together these remove roughly 1.9 GB of hot pages that are currently competing with real queries for cache and I/O budget.

## Not changing

- The 30-minute idle logout rule and the biometric requirement on genuine app switches stay exactly as specified.
- No changes to health payload contents, ACA/DELT hashing, or any pipeline data.

## Verification

- Re-run the slow-query report after the changes and confirm `staged_health_data` scans and indexer call counts drop.
- Confirm table sizes for `net._http_response` and `cron.job_run_details` fall to a few MB.
- Cold launch should go straight to the wallet with no Face ID prompt; backgrounding the app for 5 seconds and returning should still prompt.
