# Fix: splash video bails to the carousel

## What I verified

- The video asset itself is fine. On the live preview host, `splash-rush.mp4` returns `HTTP 200`, `content-type: video/mp4`, 10,959,206 bytes (~11 MB), with range support. Nothing is broken about the file or its URL.
- The audio file (~9 MB) serves the same way, which is why sound keeps working.
- The splash component was changed in the last two rounds of work: first an autoplay fallback was added (older iPhone WebKit often ignores `autoplay` until an explicit `.play()`), then a skip debounce was added because the audio-unlock tap was dismissing the splash instantly.

## Why the video still fails

The autoplay fallback carries a 3.5-second guard: if the `<video>` has not reached `readyState >= 2` by then, the component sets `autoplayBlocked` and collapses the whole video phase. An 11 MB MP4 on a phone network routinely needs longer than 3.5 s to buffer its first frames — especially while a 9 MB audio file is downloading in parallel on the same connection. So the guard fires on a video that was merely still loading, the video is hidden, the shortened logo timeline runs, and the app lands on the "Earn From Your Essence" carousel. That matches exactly what you see: it starts, then bails.

Secondary contributor: the guard also fires when `currentTime === 0`, which is true for a video that has buffered but not yet been granted playback — a loading state, not a failure.

## The fix

1. Stop treating "still buffering" as "autoplay blocked". Only set `autoplayBlocked` on a genuine `NotAllowedError` from `video.play()`, or on a real media `error` event.
2. Replace the 3.5 s bail with a much longer safety net (about 12 s) that only fires if the video has produced no data at all — no `loadedmetadata`, no progress. If any frames have arrived, keep waiting and let playback start.
3. Start the cinematic timeline from actual playback, not from mount. Begin the 8-second video window when the `playing` event fires, so a slow start delays the logo rather than cancelling the video.
4. Keep the video visible once it is playing, and drive the logo hand-off from the video's `ended` event as well as the timer, whichever comes first.
5. Reduce contention at boot: give the video download priority over the audio track by letting the audio use `preload="metadata"` until the video is playing.
6. Leave the existing skip debounce, the music credits, the logo glow, and the audio carry-over into the carousel exactly as they are.

## Technical notes

All changes are in `src/components/FlashingSplashScreen.tsx`, plus one `preload` attribute change in `src/components/SplashAudioProvider.tsx`. No backend, routing, or auth changes. State machine stays `video -> logo -> logoFadeOut -> white`; only the transition triggers change.

## Verification

Load the preview, confirm the video paints and runs its full ~8 s with the "Timeless by Zebulon / RM Records" credit, then the logo reveals and dissolves into the carousel with the music still playing.
