## Condense the `/onboarding` page layout

**Problem:** The "Secure & Continue" button is below the fold because the onboarding card has too much vertical spacing for the available viewport.

**Changes:**
1. **Tighten outer container** — reduce `p-4` to `p-2` (or `px-3 py-2`) on the form wrapper while keeping safe-area insets.
2. **Compress card header** — change `CardHeader space-y-2` to `space-y-1` and shrink the icon container from `w-12 h-12` to `w-10 h-10`.
3. **Reduce content gaps** — change `CardContent space-y-5` to `space-y-3` so the four inputs, badge, notice, and button sit closer together.
4. **Shrink info boxes** — reduce padding on the privacy badge and legal notice from `p-3` to `p-2`.

These four spacing reductions will bring the CTA fully into view without removing any fields or content.
