

# Plan: Universal Safe Areas, Compact Toasts, and Cinematic Splash Screen

## 1. Universal Safe Area Insets

### Settings Page (`src/pages/Settings.tsx`)
- Add `pt-[max(0.5rem,env(safe-area-inset-top))]` to the container
- Add `pb-[env(safe-area-inset-bottom)]` at the bottom

### Onboarding Page (`src/pages/Onboarding.tsx`)
- Add safe-area-inset-top padding to the wrapper
- Add safe-area-inset-bottom padding

### Auth Page (`src/pages/Auth.tsx`)
- Add safe-area-inset-top/bottom padding

### Landing Screen (`src/components/LandingScreen.tsx`)
- Add safe-area insets to the full-screen carousel

---

## 2. Shrink Toasts 70%, Bottom-Left, 4s Auto-Dismiss

### Sonner Component (`src/components/ui/sonner.tsx`)
- Set `position="bottom-left"` on the Sonner component
- Set `duration={4000}` for 4-second auto-dismiss
- Set `style={{ bottom: '5rem' }}` to sit above the bottom nav bar
- Add custom CSS classes to scale toast size down 70%: smaller font, reduced padding, compact width

### Toast CSS (`src/index.css`)
- Add global styles targeting `.toaster` group to reduce font-size to ~0.7rem, padding to ~0.5rem, max-width to ~220px

---

## 3. Cinematic Splash Screen Redesign (`src/components/FlashingSplashScreen.tsx`)

Complete rewrite with a multi-phase animation sequence:

**Phase 1 — Milky Fluid Surface (0–2s)**
- Full-screen animated gradient background simulating cloudy, milky fluid (CSS keyframe animation using shifting radial gradients in whites, creams, and pale opalescent tones)

**Phase 2 — "Life" Handwritten Reveal (2–5s)**
- Import Brittany font (Google Fonts or local @font-face)
- Letters "L", "i", "f", "e" appear one at a time with staggered delays (0.6s each)
- Each letter fades/scales in with a slight upward motion, simulating handwriting
- CSS `clip-path` or opacity+transform animations

**Phase 3 — Text Fades (5–6s)**
- "Life" text fades out smoothly

**Phase 4 — Logo Emerges (6–8.5s)**
- IDIA Life logo scales up from small (0.3) to full size with opacity 0→1
- Positioned center-screen
- Subtle blur-to-sharp transition (filter: blur(8px) → blur(0))
- The milky fluid background continues shifting subtly

**Phase 5 — White Fade-Out (8.5–10s)**
- Entire screen fades to pure white (overlay div with opacity 0→1)
- Evangelical "heavenly" feel — bright, washed out, luminous
- After full white, calls `onComplete()`

**Technical approach:**
- All CSS keyframe animations (no external libraries needed)
- `@font-face` for Brittany script font (will source a free script font similar to Brittany — likely "Great Vibes" or "Dancing Script" from Google Fonts as Brittany is a premium font)
- Multiple `useState` phases controlled by `setTimeout` chain
- Milky fluid effect: layered radial-gradient with `background-position` animation

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/FlashingSplashScreen.tsx` | Full rewrite — cinematic splash |
| `src/components/ui/sonner.tsx` | Position bottom-left, 4s duration, compact sizing |
| `src/index.css` | Toast size reduction styles, Brittany font-face |
| `src/pages/Settings.tsx` | Safe area insets |
| `src/pages/Onboarding.tsx` | Safe area insets |
| `src/pages/Auth.tsx` | Safe area insets |
| `src/components/LandingScreen.tsx` | Safe area insets |

