# Fix the Apple Health connect spinner and the false "Connected" badge

## What the records actually show

- The Apple Health row on your account is currently marked active with a last sync of **19:21 UTC today**, and 105 health rows landed at 19:21 (plus 35 at 17:07). So the sync function itself works.
- **No new consent record was written today at all** — the newest Apple Health consent record is from Sep 4, 16:47. Every consent record is written immediately after the Face ID challenge and before anything is sent to the sync function.

That combination says the connect attempt stopped *at the Face ID / consent step*, before anything was ever sent to the sync function. The rows at 17:07 and 19:21 came from the background 6-hour refresh, which reuses the older stored consent and quietly re-marks the connection active. That is why the tab reads "Connected" after you navigate away and back, even though your connect attempt failed.

Two separate defects produce what you saw.

## Defect 1 — the consent step can hang forever

The wait for the phone's biometric answer has no time limit and listens for exactly one signal from the shell. If that signal never arrives (sheet dismissed, app backgrounded during the prompt, shell replying on a different channel), the modal spins with nothing to recover it, and the 30-second recovery timer never even starts — it is only armed *after* the biometric completes.

Fix (app side only, no Swift, no sync function):

- Arm the watchdog the moment "Connect Data" is tapped, in two phases: consent phase, then device-fetch/ingest phase. Each phase fails with a message naming which step stalled instead of an unexplained spinner.
- Accept the shell's biometric result from either the event channel or a global callback, so a single missed signal cannot deadlock the flow.
- Always detach the listeners on failure so a retry starts clean.
- Keep the connection watcher (realtime + poll) running after a timeout and re-check on return to foreground: if the connection turns active with a fresh sync stamp, flip the modal to success rather than leaving it stuck on the error.

## Defect 2 — the Data tab calls it "Connected" when it is not

The tab lists a connection as connected if any row exists for it, ignoring whether it is actually active. The modal seeds an inactive placeholder row at the start of a connect attempt, so the tab immediately shows "Connected" even when the attempt fails.

Fix:

- Only treat a connection as connected when it is active.
- Stop seeding the placeholder row before consent succeeds; write it after the consent anchor exists, so a failed attempt leaves no misleading row.
- Make disconnect consistent: the modal and the tab currently do different things (one deactivates, one deletes). Both go through the same delete path.

## Technical detail

- `src/utils/acaGenerator.ts` — bound the native biometric promise with a timeout and a second accepted resolution channel; guaranteed listener cleanup.
- `src/components/AppleHealthModal.tsx` — phase-based watchdog armed at tap; move the `data_connections` seed to after the consent write; keep the realtime/poll safety net alive through the error state and re-check on `visibilitychange`; success reconciliation from an active row with a recent `last_sync_at`.
- `src/components/DataDashboard.tsx` — filter `data_connections` on `is_active` when building the visible list; single disconnect path.
- Not touched: `supabase/functions/apple-health-sync/index.ts` and the native shell.

## Verification

Hardware only. After the change, one connect attempt from your iPhone should produce a new consent record with today's timestamp, a fresh sync stamp on the connection, and either a self-closing modal or an error that names the exact step that stalled. A failed attempt should leave the Data tab showing "Not connected".
