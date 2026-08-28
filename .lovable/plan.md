# Fix: splash video dies when the music starts (iOS shell)

## What I verified

- The video file is not the problem. `splash-rush-web.mp4` serves from both the preview host and `life.thebigidia.com` as `video/mp4`, 3,127,828 bytes, with range support.
- Encode is the most iOS-friendly form possible: H.264 **Main / Level 3.1**, `yuv420p`, 960x540, 24 fps, exactly 8.0 s, **no audio track**, and the `moov` atom sits before `mdat` (fast-start), so playback can begin after the first few KB.
- The splash component already sets `muted`, `playsinline`, `webkit-playsinline`, imperative `play()`, error-reload recovery, and a progress watchdog.

Confirmed with you: the same failure occurs in both the native iOS shell and the ordinary Lovable preview. That rules out the Swift shell as the root cause and means **no new Apple release should be required**.

## Diagnosis

The regression is in the shared React playback path. Comparing the current component with the last known working splash revealed a concrete playback-policy change: the working `<video>` explicitly set both `defaultMuted` and `muted`, but a recent cleanup removed `defaultMuted`.

```text
last known working:  defaultMuted=true + muted=true before autoplay evaluation
current version:     muted React prop + later imperative v.muted=true
```

WebKit evaluates autoplay eligibility during media initialization. `defaultMuted` marks the element muted at creation; assigning `v.muted = true` later in an effect can be too late. The native play glyph, no `playing` event, and eventual no-progress timeout match an autoplay-policy rejection. The same React code runs in Lovable and the shell, explaining the identical behavior in both.

React Strict Mode amplifies the race in preview: it mounts, cleans up, and mounts effects again in development, causing overlapping `play()` calls from the video and audio providers. The current recovery logic handles `AbortError`, but it cannot cure a video that WebKit classified as autoplay-ineligible at element creation.

## The fix (web side)

1. **Restore creation-time muting.** Put `defaultMuted: true` back on the video element while retaining `muted`, `playsInline`, and the imperative property assignments. This restores the exact autoplay eligibility setup from the last working implementation.
2. **Remove competing auto-start calls.** Make one guarded video start routine responsible for the initial `play()`; media events may schedule recovery only when the element is actually paused. This prevents `loadeddata`, `canplay`, Strict Mode, and `pause` from superseding one another.
3. **Sequence audio after the first painted video frame.** `SplashAudioProvider` creates/preloads the track immediately but waits for a `splash:video-playing` event before playing it. It still carries through the carousel and fades on "Get Started". This is web-only and works equally in Lovable and the shell.
4. **Do not convert autoplay rejection into a timed white-screen exit.** On a genuine `NotAllowedError`, keep the video phase visible and attach a one-time tap recovery rather than immediately advancing to the logo. The existing two-second skip debounce will not misread that recovery tap as "skip".
5. **Keep diagnostics query-gated.** Add an on-screen event trace only for `?splashdebug=1`, so an iPhone screenshot can identify any remaining `play()` rejection without affecting normal users.

## Technical notes

Changes are limited to `src/components/FlashingSplashScreen.tsx` and `src/components/SplashAudioProvider.tsx`. No Swift/Xcode, backend, routing, auth, asset, or carousel changes. The phase machine stays `video -> logo -> logoFadeOut -> white`.

## Verification

First verify in the Lovable preview, where the issue is reproducible without a native release; then verify the same deployed web update in the existing iOS shell. Expected: video starts without a play glyph, runs its full 8 s with the music credit, music begins after the first video frame, logo reveals, and the carousel arrives with music still playing.
