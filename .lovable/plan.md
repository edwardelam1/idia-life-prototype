# Splash Audio: Zebulon (Timeless 432 Hz)

Add the uploaded track as the soundtrack of the splash sequence so the video, logo reveal and music finish together.

## What happens
- The moment the splash mounts, the track starts alongside the rushing video.
- It keeps playing through the logo fade-in, glow hold and fade-out.
- Over the last ~1.5s (white dissolve) the volume fades smoothly to zero, then stops — no abrupt cut, no bleed into the landing screen.
- Tapping to skip the splash also stops and fades the audio out immediately.
- If the splash falls back to the shortened path (video autoplay blocked), the audio timeline compresses with it and still ends on the logo release.

## Notes on the track
The uploaded file is 3m50s; the splash is 13s, so only the opening segment plays with a fade-out at the end.

## iOS/Android caveat
Mobile browsers and WKWebView block *audible* autoplay without a user gesture (muted video is exempt). On a cold app launch the track may be silently blocked. Handling:
- Attempt playback immediately; if the browser rejects it, fail silently (no error, splash unchanged).
- Register a one-shot listener so the first touch anywhere starts the music mid-timeline at the correct offset.
- Respect device silent mode — no unmute prompts or UI added.

## Technical
- Register the mp3 as a CDN asset pointer: `src/assets/zebulon-timeless-432hz.mp3.asset.json` via `lovable-assets create` (no binary in the repo).
- `src/components/FlashingSplashScreen.tsx` only:
  - `useRef<HTMLAudioElement>` with the imported asset URL, `preload="auto"`, `playsInline`.
  - Start playback in the existing mount effect next to the video `.play()` call, with a `.catch()` that arms a one-shot `touchstart`/`click` resume.
  - Add a fade-out timer aligned with the existing `white` phase (interval ramping `volume` to 0 over 800ms), then `pause()`.
  - Clean up timers, interval and listeners on unmount and on skip so nothing survives the splash.
- No other files change; no backend or state changes.
