## Show the Menu Bar During the Spotlight Tour

In `src/components/life/WelcomeSequence.tsx`, Step 3 (spotlight tour) is the slide that begins with the Wallet copy *"See, manage, and control your world…"*. Today the welcome overlay paints its full glossy background across the entire viewport at `z-[200]`, so the bottom menu bar (rendered in `MainApp` at `z-30`) is hidden behind it. The radial spotlight is just a dim overlay on top of that background — there's nothing real underneath to spotlight.

Also: the `SPOTLIGHT_TABS` list includes `shop`, but the Shop tab is gated until July 11, 2026 in `MainApp`. Pre-release, `tabRefs.current.shop` is `undefined`, the spotlight measurement no-ops, and the tour silently sticks on whatever tab was last computed.

### Changes (frontend only, `src/components/life/WelcomeSequence.tsx`)

1. **Reveal the real menu bar during Step 3.**
   - Move the glossy `background: radial-gradient(...)` styles off the root `fixed inset-0` container and onto a new `<div className="absolute inset-0 -z-10">` that renders only when `step !== 3`.
   - Root container keeps `fixed inset-0 z-[200]` + layout/safe-area padding but becomes transparent during Step 3 so the bottom nav (z-30) is visible underneath.
   - Keep the existing radial *dim* overlay + spotlight ring exactly as-is — they already cut a hole around the tab using its measured rect.
   - Make sure the spotlight dim overlay and the copy card use `pointer-events-none` where needed so the nav tabs visually appear but the user still progresses only via the "Next/Continue" button (no accidental tab switching mid-tour).

2. **Hide Shop from the tour until July 11, 2026.**
   - Add the same `IDIA_PAY_RELEASE_DATE` gate used in `MainApp` (`new Date() >= 2026-07-11Z`).
   - Filter `SPOTLIGHT_TABS` with `useMemo` so the `shop` entry is excluded when `!isPayReady`. Result is 5 slides pre-release (Wallet → Data → Life → Vote → Pro), 6 post-release.
   - Pager dots and "Next vs Continue" already derive from the array length, so they update automatically.

3. **Defensive guard.**
   - In the Step 3 `compute` effect, if `tabRefs.current?.[tab.id]` is missing, skip to the next tab (or to Step 4 if it's the last) instead of getting stuck. This protects against any future tab being gated similarly.

### Out of scope
- No changes to `MainApp`, the nav itself, copy, animations, or other steps (1, 2, 4, 5).
- No backend, routing, or business-logic changes.