# Fix the iOS splash video cancellation

## Verified cause

- The current splash source is the original 10.96 MB MP4, and inspection confirms it contains both an H.264 video stream and an AAC audio stream.
- `SplashAudioProvider` starts a separate MP3 at the same time. In iOS WKWebView, that separate audio playback can take over the shared media session and pause the splash video's embedded audio/video session. This matches the observed behavior: the video begins, is immediately cancelled, while the MP3 continues.
- The current splash code listens for `playing`, `stalled`, `ended`, and `error`, but not `pause`; once iOS pauses the video, nothing resumes it.
- Repository history confirms this exact issue had already been addressed with a 3.1 MB, fast-start, video-only `public/splash-rush-web.mp4`. A later revert deleted that file and switched the component back to the original MP4, reintroducing the problem.
- The parent splash state only advances when `onComplete` runs, so there is no separate parent timer cancelling the video. React Strict Mode remounting is also not the direct cause because the audio and splash remain under the same mounted provider.

## Implementation

1. Restore the previously generated web-optimized splash asset from repository history.
   - H.264 video remains visually unchanged.
   - Remove the embedded AAC stream so the video cannot compete with the separate music track for the iOS audio session.
   - Preserve MP4 fast-start metadata for immediate WKWebView playback and reduce transfer size from about 11 MB to about 3.1 MB.

2. Point `FlashingSplashScreen` to the optimized local video asset instead of the reverted asset-manifest master.

3. Harden the video lifecycle without changing the cinematic sequence.
   - Treat `pause` as recoverable unless the video ended or the splash intentionally left the video phase.
   - Retry playback through one guarded play routine so overlapping `loadeddata`, `canplay`, and recovery calls cannot cancel one another.
   - Keep genuine media errors and genuine autoplay-policy rejection as the only fallback conditions.
   - Clean up every listener, timer, and retry when the component unmounts.

4. Keep existing behavior unchanged.
   - Full 8-second video.
   - “Timeless by Zebulon / RM Records” credit during the video.
   - Logo reveal and fade sequence.
   - Music continues through the carousel and fades only after “Get Started.”
   - Existing early-tap skip protection remains.

## Verification

- Confirm the served optimized MP4 has H.264 video, no audio stream, fast-start metadata, and byte-range support.
- Run the splash and record media events/current time to confirm playback advances continuously for the full eight seconds and does not reach the carousel early.
- Confirm the logo transition occurs after video completion and the separate MP3 continues into the carousel.
- Check the production build and current runtime diagnostics for errors.
