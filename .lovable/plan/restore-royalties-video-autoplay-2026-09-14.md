# Restore royalties video autoplay

## Confirmed cause

`RoyaltyInfoModal` renders the MP4 `src` immediately, but only adds `autoplay`, creation-time muting, and iPhone inline-playback attributes afterward in an effect. WebKit can decide the video requires a user gesture before that effect runs. The element also lacks the declarative `autoPlay` flag, explaining why autoplay has now regressed in the web preview too.

No runtime or build error currently explains the failure; the preview build is healthy.

## Changes

1. **Create the media element in an autoplay-eligible state**
   - Render it with `autoPlay`, `muted`, `playsInline`, `loop`, and `preload="auto"` from its first frame.
   - Use a ref callback to set `muted`, `defaultMuted`, `playsinline`, `webkit-playsinline`, and `autoplay` before assigning the MP4 source.
   - Do not allow React to attach `src` before those properties and attributes exist.

2. **Use one guarded playback routine**
   - Start playback when the pop-up opens.
   - Retry only while the pop-up is open and the video is paused, using `loadedmetadata`, `loadeddata`, `canplay`, and page-visibility recovery.
   - Prevent overlapping `play()` calls and clean up every listener and retry when the pop-up closes.

3. **Preserve the requested behavior**
   - Keep the video muted, inline, and continuously looping.
   - Pause and rewind it when the pop-up closes.
   - Add no controls, tap-to-play prompt, fallback page, or unrelated visual changes.

## Verification

- Confirm in the web preview that reopening the royalties pop-up starts playback automatically and that time advances through a loop.
- Confirm the MP4 request succeeds and no playback errors appear.
- Verify the production build, then have you check the same pop-up once on iPhone because WebKit autoplay behavior cannot be fully reproduced by Chromium.
