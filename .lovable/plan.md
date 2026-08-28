# Splash video stall + false "back up your vault" prompt

## 1. Backup nudge fires even when the vault is already backed up

Confirmed root cause. `MainApp` decides with:

`needsBackup = !!profile && profile.is_seed_backed_up !== true`

but `profile` comes from `useEnhancedProfile`, which selects the profile row with `select("*")` and then re-maps it field by field into a new object — and `is_seed_backed_up` is not among the copied fields. So the value is always `undefined`, `undefined !== true` is always true, and the nudge fires for everyone, every session.

The same hook also hardcodes `is_seed_backed_up: false` on the wallet object, which is why Enhanced Profile shows "Not backed up" too. The wallet dashboard badge reads the flag straight from the database with its own query, which is why that one correctly shows "backed up".

Fix:
- Carry the real `is_seed_backed_up` value from the profile row into the mapped profile object in `useEnhancedProfile` (and stop hardcoding `false` on the wallet mapping — read it from the same profile row).
- Add the field to the `EnhancedProfile` type so the `as any` cast in `MainApp` can go away.
- After a successful backup in `SeedBackupModal`, refresh the profile so the nudge cannot reappear later in the same session.
- Persist the "Later" dismissal per user per day (same localStorage pattern already used by the create-wallet nudge) so a user who declines isn't re-prompted on every navigation.

## 2. Intro video stalls again

What I verified this time:
- The optimized asset is still in place and still correct: `splash-rush-web.mp4` serves `HTTP 200`, `video/mp4`, 3,127,828 bytes, a single H.264 video stream with **no audio stream**, 8.000 s duration, and the `moov` atom at the head of the file (fast-start). The asset is not the problem.
- `FlashingSplashScreen` still contains last round's hardening: pause recovery, guarded `tryPlay`, 12 s no-data-only bail.
- The last commits touched wallet backup files, not the splash.

So the earlier fix is still in the code and the asset is healthy — which means the current stall is not a repeat of the same root cause, and I will not name a cause I cannot see. The one remaining path that produces exactly "video starts, then the app jumps to the carousel while music keeps playing" is the `autoplayBlocked` flag being set at runtime by the `error` handler or a `NotAllowedError`, which instantly hides the video and collapses the timeline. That is a hypothesis, not a confirmed diagnosis.

Plan:

1. **Instrument first.** Add a compact splash telemetry log (`[SPLASH]` console lines) recording: readyState transitions, every media event (`loadedmetadata`, `loadeddata`, `canplay`, `playing`, `pause`, `waiting`, `stalled`, `suspend`, `error`, `ended`), `video.error.code`/`message`, `currentTime` samples once per second, and the exact reason the component leaves the video phase. Enable it behind `?splashdebug=1` plus always-on for the error path, so the failing device produces a verdict in one run.
2. **Remove the single-point-of-failure bail.** Stop letting one `error` event collapse the whole sequence: on a media error, reload the element and retry playback once before falling back to the logo-only path. Only a second consecutive failure sets `autoplayBlocked`.
3. **Stop the phantom timeline drift.** Drive the logo hand-off from `ended` plus a watchdog based on `currentTime` progress rather than a fixed 8 s wall-clock timer, so a mid-video re-buffer delays the logo instead of cutting the video off while it is still painting.
4. **Re-verify** by replaying the splash with telemetry on and reading the captured event sequence. If the logs show a specific failure (decode error, network abort, iOS media-session takeover), apply the targeted fix for that cause in the same round rather than guessing.

## Technical notes

Files touched: `src/hooks/useEnhancedProfile.ts`, `src/components/MainApp.tsx`, `src/components/wallet/SeedBackupModal.tsx`, `src/components/FlashingSplashScreen.tsx`. No backend, schema, or auth changes.
