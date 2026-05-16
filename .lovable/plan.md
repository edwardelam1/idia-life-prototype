## Taper the Spotlight Gloss So the Menu Bar Stays Crisp

In `src/components/life/WelcomeSequence.tsx` (Step 3 spotlight overlay), the dim layer applies a uniform `backdrop-filter: blur(2px)` across the whole viewport. The radial gradient only fades the *tint*, not the blur, so the menu tabs inside the "transparent" hole still get blurred and washed out.

### Fix (single overlay swap, lines ~269–276)

Replace the dim layer with a masked overlay so the blur and tint are both removed inside the spotlight and taper smoothly outward into the glass.

- **Background tint**: keep `rgba(248,250,252, ~0.78)` for the surrounding glass.
- **Backdrop blur**: bump to ~`blur(10px)` so the glass area reads as glass (currently it barely registers).
- **Mask out the spotlight**: apply `mask-image` + `-webkit-mask-image` with a radial gradient centered on `spotlightRect`:
  - `transparent` from `0` → `r` (fully clear over the menu — no tint, no blur)
  - taper through `rgba(0,0,0,0.35)` at `r + 24px`
  - to `black` at `r + 110px` (full gloss resumes)
- Keep `pointer-events-none` and the `transition-all duration-500`.
- Leave the glow ring (second div) and copy card untouched.

### Why this works
`mask-image` applies to the element's own paint *including* its `backdrop-filter`. A transparent mask region produces a true hole — the live menu bar underneath renders unblurred and untinted — while the surrounding gloss keeps its frosted look. The taper avoids a hard edge between the clear hole and the glass.

### Out of scope
No other steps, no MainApp/nav changes, no logic changes.