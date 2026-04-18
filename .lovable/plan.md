
Goal: make Apple Health feel instant again by getting to the designed connected state in under ~3 seconds, while the real first sync continues in the background.

Do I know what the issue is? Yes.

What is actually slow
- The delay is not mainly “file transport.” The biggest bottlenecks in this repo are:
  1. `AppleHealthModal.tsx` does serial work before native handoff: auth/profile lookup, ACA hash generation, ACA DB upsert.
  2. The modal stays in `connecting` until `onHealthDataSyncComplete`, which appears to mean “native query + upload + server processing finished,” not just “connection established.”
  3. `supabase/functions/apple-health-sync/index.ts` inserts records one-by-one inside nested loops, which is expensive on first sync.
- Result: the UI is waiting on the entire ingest pipeline instead of the connection handshake.

What I will change
1. Make “Connect” land in the connected area fast
- Rework `src/components/AppleHealthModal.tsx` so the blocking spinner is only for the bridge launch, not the whole sync.
- Remove the waiting paragraph entirely.
- As soon as the native bridge is successfully dispatched, move the modal into the designed connected view instead of keeping it in the spinner state.
- Keep the modal closable the whole time.

2. Separate connection establishment from initial backfill
- Treat “bridge accepted + Apple Health connection row created” as the point where the UI becomes connected.
- Keep the full HealthKit fetch/upload running in the background.
- Use the later native completion callback only to update stats like synced count / steps / BPM, not to decide whether the modal is allowed to leave the spinner.
- If an explicit native error arrives before connection is established, show error normally. If it arrives after connected state, show a non-blocking sync issue state without breaking the connected UI.

3. Remove unnecessary front-end blocking before native handoff
- In `src/components/AppleHealthModal.tsx`, minimize pre-bridge latency by tightening the order of:
  - session/profile read
  - ACA creation
  - `user_aca_records` write
  - native `postMessage`
- The connection UI should not wait on extra client-side refresh cycles.

4. Speed up the server path for real first sync
- Refactor `supabase/functions/apple-health-sync/index.ts` to batch raw record inserts instead of inserting each sample individually in nested loops.
- Preserve DELT verification, real-data-only enforcement, and existing downstream triggers.
- This keeps the real sync materially faster without fake data or shortcutting the pipeline.

5. Keep the existing close/race-condition fix intact
- Preserve the single `closeAndReset()` path and session-gated callbacks.
- Ensure background completion cannot re-block or re-open the modal.

Files to update
- `src/components/AppleHealthModal.tsx`
- `src/components/DataDashboard.tsx` (only if parent refresh timing needs a small adjustment)
- `supabase/functions/apple-health-sync/index.ts`

Technical details
```text
Tap Connect
  -> fast ACA + bridge dispatch
  -> modal immediately shows "Apple Health Connected"
  -> background native fetch/upload continues
  -> edge function bulk-inserts records
  -> callback enriches connected view with real synced data
```

Expected result
- No long “waiting” message in the modal.
- User reaches the connected area in ~2–3 seconds instead of waiting for full first-sync completion.
- Real Apple Health data still fully syncs through the existing pipeline.
- Modal closes normally and reopens in connected state.

Validation
- First connect on iOS reaches connected UI in under ~3 seconds.
- No regression in ACA / DELT verification.
- First full sync still writes real records into `raw_health_data`.
- Connected view remains stable while background sync finishes.
- Close/X/overlay/Escape still work correctly.
