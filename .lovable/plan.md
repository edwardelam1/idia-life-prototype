# Plan: Remove Play Controls from Splash Video

## Goal
Ensure the rushing splash video in `FlashingSplashScreen.tsx` shows no native or browser-provided playback controls.

## Current state
The `<video>` element already omits the `controls` attribute, so HTML5 controls are not rendered. To make this explicit and block native overlays (picture-in-picture, remote playback), we will add explicit opt-out attributes.

## Proposed change
Update the `<video>` element in `src/components/FlashingSplashScreen.tsx`:

- Add `controls={false}` (explicitly disables the default control bar).
- Add `disablePictureInPicture` (prevents iOS/macOS picture-in-picture overlay).
- Add `disableRemotePlayback` (prevents Chromecast/AirPlay remote controls).

Keep all existing attributes: `autoPlay`, `muted`, `playsInline`, `preload="auto"`, and the absolute full-screen styling.

## Files touched
- `src/components/FlashingSplashScreen.tsx` (video element attributes only)

## Result
No playback controls or native overlays appear during the splash video; the only interaction remains clicking/tapping anywhere to skip.