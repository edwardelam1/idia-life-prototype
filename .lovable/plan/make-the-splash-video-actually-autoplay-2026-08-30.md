# Make the splash video actually autoplay

## Symptom

The splash video element appears, shows a first frame or the native play glyph, and then sits there. No playback, and the sequence does not visibly recover.

## Why the current approach can still fail

The video is rendered by React as JSX with `autoPlay`, `muted`, and a `defaultMuted` spread. React does not reliably reflect `muted`/`defaultMuted` as an *attribute* in the initial DOM — it sets them as properties after the element is created and, in some paths, after `src` has already been assigned. WebKit decides autoplay eligibility at the moment media loading begins. If the element is not already marked muted in the markup at that instant, the load is classified as requiring a gesture, and every later `play()` is rejected — which is exactly the "sits with a play glyph" state.

The current recovery path also makes this worse rather than better: a `NotAllowedError` sets `awaitingGestureRef`, which suppresses further automatic retries and turns the first tap into a resume instead of a skip, so the splash looks frozen.

## The fix

1. **Build the video element with attributes set before the source.** Create the element through a ref callback (or a small imperative mount) that sets `muted`, `defaultMuted`, `playsinline`, `webkit-playsinline`, `autoplay`, and `preload` as real attributes *first*, and only then assigns `src`. This gives WebKit a muted, inline-eligible element at load time, which is the state that autoplays without a gesture.
2. **Single owner for starting playback.** Keep one guarded start routine. Call it on mount and re-arm it from `loadedmetadata`, `loadeddata`, `canplay`, and `stalled` — but only when the element is paused and not ended.
3. **Retry instead of giving up on rejection.** On `NotAllowedError`, re-mute, reload the element, and retry with a short backoff (a few attempts over ~2 s) before falling back to gesture recovery. Do not immediately latch `awaitingGestureRef` on the first rejection.
4. **Keep audio strictly after video.** The music continues to start only on the `splash:video-playing` event, so the audio session never competes with video startup.
5. **Visible last-resort affordance.** If every retry is rejected, show a subtle centered tap-to-play prompt over the video instead of a silent frozen frame, and keep the existing progress watchdog so the sequence never hangs forever.
6. **Diagnostics stay query-gated.** `?splashdebug=1` continues to print the event trace so a device screenshot can confirm which step rejected.

## Technical notes

Changes are limited to `src/components/FlashingSplashScreen.tsx` (element construction, start/retry routine, gesture fallback UI) and, if needed, a small guard in `src/components/SplashAudioProvider.tsx`. No native shell, backend, routing, or asset changes; the phase machine stays `video -> logo -> logoFadeOut -> white`.

## Verification

Check in the Lovable preview first (the sandbox browser cannot decode H.264, so verification is on-device/preview), then on the iPhone shell: the video should begin within a second of the splash appearing, with no play glyph, run the full 8 s with the music credit, music entering right after the first frame, then logo and carousel.
