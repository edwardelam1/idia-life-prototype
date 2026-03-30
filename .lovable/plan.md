

# Lock Splash Screen & Landing Carousel on Mobile

## Problem
On iPhone, the splash screen and landing carousel allow vertical scrolling/bouncing due to iOS Safari's elastic scroll behavior. Both screens should be viewport-locked with no scroll.

## Changes

### 1. `src/components/FlashingSplashScreen.tsx`
- Add `overflow-hidden touch-none` to the root `div` to prevent all touch-based scrolling

### 2. `src/components/LandingScreen.tsx`
- Change root from `min-h-screen` to `h-screen fixed inset-0` with `overflow-hidden touch-none` to fully lock the viewport
- Add `touch-none` to the carousel container to prevent vertical drag on the slides

### 3. `index.html`
- Add a `<meta name="viewport">` tweak if not already present: ensure `viewport-fit=cover` is set for full-screen lock on iOS notch devices

### 4. `src/index.css`
- Add global `html, body { overflow: hidden; height: 100%; }` scoped via a utility or ensure the root container prevents scroll on these screens. Alternatively, add a small CSS rule:
```css
html, body { overscroll-behavior: none; }
```
This prevents iOS rubber-banding globally.

## Technical Details
- `touch-none` (Tailwind) maps to `touch-action: none`, disabling browser touch gestures
- `overscroll-behavior: none` prevents elastic/bounce scrolling on iOS
- `fixed inset-0` ensures the landing page fills exactly the viewport with no overflow

