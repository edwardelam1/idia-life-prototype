# Fix: splash video dies when the music starts (iOS shell)

## What I verified

- The video file is not the problem. `splash-rush-web.mp4` serves from both the preview host and `life.thebigidia.com` as `video/mp4`, 3,127,828 bytes, with range support.
- Encode is the most iOS-friendly form possible: H.264 **Main / Level 3.1**, `yuv420p`, 960x540, 24 fps, exactly 8.0 s, **no audio track**, and the `moov` atom sits before `mdat` (fast-start), so playback can begin after the first few KB.
- The splash component already sets `muted`, `playsinline`, `webkit-playsinline`, imperative `play()`, error-reload recovery, and a progress watchdog.

Confirmed with you: it fails **only in the native iOS WKWebView shell**, and **the video dies at the exact moment the Zebulon track starts**.

## Diagnosis

Two media elements are competing for one iOS audio session:

```text
mount
 ├─ SplashAudioProvider: new Audio(mp3).play()   <-- takes the audio session
 └─ FlashingSplashScreen: <video muted> .play()  <-- gets interrupted / refused
```

On iOS, starting an `<audio>` element makes WKWebView activate/reconfigure the `AVAudioSession`. A muted video that is mid-startup gets interrupted by that reconfiguration and WebKit refuses to resume it inline, which is exactly why you see the native **play-button glyph** instead of frames. The glyph is the "playback was refused" state, never a "file is broken" state.

This is also the honest answer to "why now": nothing you changed touched the video, and the file is provably fine, so the trigger is the shell's media policy plus the audio element racing the video at boot. The web side can be made resilient to it; one part of the fix belongs in the Swift shell.

## The fix (web side)

1. **Sequence the two elements instead of racing them.** The video starts alone. `SplashAudioProvider` waits for a `splash:video-playing` event (or a short fallback timeout if no video phase exists) before calling `audio.play()`. Nothing else about the audio behaviour changes: it still carries over into the carousel and still fades out on "Get Started".
2. **Survive the session change anyway.** If the video is paused or interrupted within the first two seconds of playback, re-issue `play()` and, if the element reports it cannot resume, restart from `currentTime = 0` once. A single interruption must not end the video phase.
3. **Never show the native glyph.** Add a `poster` frame and keep `controls={false}` plus `object-cover` so that even a refused element shows artwork rather than a play button.
4. **On-device diagnostics you can actually read.** The `[SPLASH]` logs are invisible on a phone, so add a temporary debug overlay (enabled with `?splashdebug=1`) that prints the last media events on screen. You screenshot it once and we know exactly which event killed it. Removed after confirmation.

## The fix (native shell — for Shawn)

The web changes above make the sequence resilient, but the shell should also stop refusing inline playback. In the `WKWebViewConfiguration`:

```swift
config.allowsInlineMediaPlayback = true
config.mediaTypesRequiringUserActionForPlayback = []
```

and at launch, before loading the URL:

```swift
try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
try? AVAudioSession.sharedInstance().setActive(true)
```

`.mixWithOthers` is the key line: it stops the audio element's session activation from evicting the video. If the shell was rebuilt recently without these, that alone explains the regression.

## Technical notes

Changes are limited to `src/components/FlashingSplashScreen.tsx` and `src/components/SplashAudioProvider.tsx`, plus one generated poster image in `src/assets`. No backend, routing, auth, or carousel changes. The phase machine stays `video -> logo -> logoFadeOut -> white`.

## Verification

Run the native build with `?splashdebug=1`. Expected: video paints and runs its full 8 s with the "Timeless by Zebulon / RM Records" credit, music joins a beat after the first frame, logo reveals, and the carousel arrives with music still playing.
