# Plan: Replace "Life" Letters with Uploaded Video in Splash

## Current behavior (`src/components/FlashingSplashScreen.tsx`)
Phases: fluid (0–400ms) → cursive "Life" letters (400–1200ms) → text fade (1200–1500ms) → polished logo emerges (1500–1900ms) → white fade (1900–2200ms) → complete.

## What changes
Replace the cursive "Life" letters block with the uploaded rushing video. The video plays fullscreen, then hands off to the existing polished IDIA logo, then white fade — same tail as today.

## Steps
1. **Upload the video as a Lovable CDN asset** (10.9 MB — too large to bundle):
   - `lovable-assets create --file /mnt/user-uploads/Create_a_video_rushing_through.mp4 --filename splash-rush.mp4 > src/assets/splash-rush.mp4.asset.json`
2. **Rewrite `FlashingSplashScreen.tsx`**:
   - New phase timeline (video is 8s but we compress the experience):
     - `video` (0 → ~3200ms): fullscreen `<video autoPlay muted playsInline>` covering the viewport with `object-fit: cover`. Milky fluid background stays behind it as a fallback while the video buffers.
     - `logo` (3200 → 3600ms): video fades out, polished logo emerges (existing scale/blur reveal, unchanged).
     - `white` (3600 → 3900ms): existing white fade-out.
     - `complete` at 3900ms.
   - Remove: cursive letters JSX, `visibleLetters` state, letter timers, Dancing Script `@import`, `'text' | 'textFade'` phase values.
   - Keep: click/touch skip, milky fluid backgrounds, logo emergence block, white overlay, `milkyShift` keyframes.
   - Import the asset pointer: `import splashVideo from '@/assets/splash-rush.mp4.asset.json'` and use `splashVideo.url` as `<video src>`.
   - Video element: muted, autoPlay, playsInline, no controls, `preload="auto"`, absolute inset-0, `object-cover`, opacity driven by phase (1 during `video`, 0 during `logo`/`white`), with a short CSS opacity transition (~400ms).

## Files touched
- `src/assets/splash-rush.mp4.asset.json` (new — CDN pointer)
- `src/components/FlashingSplashScreen.tsx` (rewrite phase logic + JSX)

## Notes
- No changes to callers — `onComplete` contract preserved.
- Total splash length shortens from 2.2s to ~3.9s; still well under Apple's slow-load rejection threshold, and the video content justifies the extra ~1.7s.
- If you'd rather keep the full 8s video playing to its natural end before the logo, say the word and I'll extend the timeline instead.
