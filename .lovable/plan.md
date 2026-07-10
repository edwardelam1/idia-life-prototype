# Plan: Play Full Splash Video

## Goal
Let the uploaded rushing splash video play its entire 8-second duration before the logo emerges and the white fade-out completes.

## Current behavior
`src/components/FlashingSplashScreen.tsx` hard-cuts the video at 3.2 seconds, then runs the existing 0.7-second logo/white tail, ending at 3.9 seconds.

## Proposed change
Only the timer constants in `src/components/FlashingSplashScreen.tsx` change:

- `video` phase: 0ms → 8000ms (full video clip)
- `logo` phase: 8000ms → 8400ms (existing 400ms logo reveal)
- `white` phase: 8400ms → 8700ms (existing 300ms white fade-out)
- `onComplete()` fires at 8700ms

Everything else stays the same:
- Skip on click/tap still works.
- Milky fluid background stays as the video buffer fallback.
- Logo emergence and white fade-out animation durations remain unchanged.
- The video element keeps `autoPlay`, `muted`, `playsInline`, and `preload="auto"`.

## Files touched
- `src/components/FlashingSplashScreen.tsx` (timer constants only)

## Result
Total splash time becomes roughly **8.7 seconds** instead of the current 3.9 seconds, and the full 8-second video is visible.