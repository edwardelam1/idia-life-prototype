## Problem

On iPhone 11 the splash video doesn't autoplay — iOS shows the native "tap to play" glyph and the timeline still advances to the slides while the video never renders. iPhone 15 plays it fine. This is a classic older-iOS/WKWebView autoplay-gating issue, not a timing bug.

Root causes on older iOS WebKit:
1. React's `muted={true}` sets the DOM property but sometimes not the HTML attribute in time — iOS only honors autoplay when the `muted` **attribute** is present at parse time.
2. Missing `webkit-playsinline` (legacy attribute still required on iOS 13/14-era WebKit inside WKWebView).
3. No imperative `.play()` fallback — if autoplay is deferred, nothing ever kicks it off.
4. `controls={false}` doesn't suppress the iOS "poster play button" overlay that appears when autoplay is blocked; only actually playing (or hiding the element) removes it.

## Fix

Edit only `src/components/FlashingSplashScreen.tsx`:

1. Replace the JSX `muted` prop with `defaultMuted` plus a ref callback that sets the `muted` attribute directly, and add `webkit-playsinline=""` alongside `playsInline`.
2. On mount, call `videoRef.current.play()` inside a `.catch()` — if it rejects (autoplay blocked), immediately advance the splash to the `logo` phase so the user never sees the stuck play glyph.
3. Add `poster=""` (empty) and `object-cover` stays, so no default frame with a play button is shown before the first video frame decodes.
4. Keep the existing 8s → logo → white → complete timeline unchanged for devices where playback succeeds.

No other files change. No dependency changes. No native/Swift changes.

## Verification

- iPhone 15: video still plays the full 8s clip, then logo, then fade — unchanged behavior.
- iPhone 11: either the video now autoplays (attribute-level `muted` + `webkit-playsinline` + imperative `play()`), or if WebKit still blocks it, the splash skips straight to the logo/fade instead of showing a stuck play button while the timeline runs behind it.
