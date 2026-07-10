## Extend Splash Logo Reveal & Fade

Make the logo an experience — let it breathe, glow, and fade gracefully instead of flashing away.

### New Timeline (`src/components/FlashingSplashScreen.tsx`)

```text
0ms      → Video starts (full 8s rush)
8000ms   → Video ends, logo begins fade-IN (slow, 1.2s ease-out with subtle scale-up from 0.92 → 1.0)
9200ms   → Logo fully visible, holds with a gentle glow/pulse
10700ms  → Logo begins fade-OUT (1.5s ease-in-out, scale 1.0 → 1.04 for a "release" feel)
12200ms  → White screen fades away (0.8s)
13000ms  → onComplete fires → app becomes interactive
```

Total splash: **~13 seconds** (up from 8.7s). Per user: load time is not a concern — this is a "brought to life" moment.

### Changes

1. **Phase timing constants** — extend `LOGO_FADE_IN`, add `LOGO_HOLD`, extend `LOGO_FADE_OUT`, extend `WHITE_FADE`.
2. **Logo element** — replace the abrupt opacity flip with a multi-stage transition:
   - Fade-in: `opacity 0 → 1` over 1200ms, `scale 0.92 → 1.0`, ease-out
   - Hold: soft glow (drop-shadow pulse) for 1500ms
   - Fade-out: `opacity 1 → 0` over 1500ms, `scale 1.0 → 1.04`, ease-in-out
3. **White overlay** — extend fade to 800ms so it dissolves rather than blinks.
4. **Skip control** — keep existing tap-to-skip so users who've seen it can bypass.

### Not changing

- Video phase (still full 8s, iPhone 11 autoplay fallback intact)
- Assets, layout, colors, or any other component
