# Splash Music: Earlier Start, Carousel Carry-Over, On-Screen Credit

Three changes to the launch experience.

## 1. Music starts sooner
Today the track is created with the splash `<audio>` element and only begins once the browser has buffered enough. Instead the audio element is created once, with `preload="auto"`, and playback is attempted the instant the app mounts (before the splash paints), with the existing silent fallback that resumes on the first touch if the browser blocks audible autoplay. No fade-in delay at the front — it comes in with the first frame of the video.

## 2. Audio keeps playing through the carousel
The track no longer fades out with the white dissolve. It continues under the 3-panel landing carousel and only fades out (over ~800ms) when the user presses "Get Started". Tapping to skip the splash also no longer stops the music — it just jumps to the carousel with the track still running. The music stops for good on: Get Started, or leaving the landing screen for any other reason.

## 3. Music credit during the video
While the rushing video is on screen, a small music-video style credit sits in the bottom-left corner, above the iOS safe area:

```text
Timeless by Zebulon
RM Records
```

Light, low-opacity white type with a subtle shadow so it reads over the video. It fades in shortly after the video starts and fades out as the logo begins its reveal — it is not shown during the logo hold, the white dissolve, or the carousel.

## Technical

- New `src/components/SplashAudioProvider.tsx` (context + provider) owning a single `HTMLAudioElement` created in a ref, mounted in `src/pages/Index.tsx` around the splash + landing branch. Exposes `fadeOutAndStop(durationMs)`.
  - Attempts `play()` on mount; on rejection arms the one-shot `touchstart`/`click` resume listener (moved out of `FlashingSplashScreen`).
  - Cleans up interval, listeners and pauses the element on unmount.
- `src/components/FlashingSplashScreen.tsx`: remove the `<audio>` element, `audioRef`, fade-on-`white` effect and the fade in `handleSkip`. Add the credit overlay div, visible only while `phase === "video"`, positioned `bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6`.
- `src/components/LandingScreen.tsx`: call the context's `fadeOutAndStop(800)` inside `handleSignUpClick` before `onSignUp()`.
- No backend, state or styling-token changes.
