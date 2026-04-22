
Goal: add a success animation for Apple Health that feels like confetti made of “data blocks,” and remove Strava and Ford from the My Data connections UI everywhere.

1. Build a reusable data-block burst animation
- Extend `src/components/psychometric/confetti.ts` or add a nearby shared animation utility for a new effect that uses small rectangular/square particles instead of standard confetti.
- Style particles in the existing brand palette with health/data-oriented colors and a tighter, more controlled burst so it feels like blocks ejecting from a source icon.
- Expose a dedicated helper such as `fireAppleHealthDataBurst(...)` that can be triggered from the Apple Health success state.

2. Anchor the animation to the Apple Health icon in the modal
- Update `src/components/AppleHealthModal.tsx` so the Apple Health icon/title area can act as the visual origin point.
- Trigger the new animation only after a successful Apple Health connection, at the same moment `connectionStatus` becomes `"connected"`.
- Keep the existing success flow intact: ACA logging, native sync completion, success message, auto-close timing, and disconnect behavior.
- Make the motion mobile-safe and modal-safe so particles render above the dialog without clipping or covering the action buttons.

3. Polish the Apple Health success state
- Refine the success panel copy/layout so the animation reads clearly as “data blocks popping off the Apple Health icon.”
- Preserve current accessibility and safe-area behavior.
- Avoid any simulated pipeline data; this is purely visual feedback tied to a real successful connection.

4. Hide Strava and Ford from the My Data page everywhere
- Update `src/components/DataDashboard.tsx` so Strava and Ford no longer appear in:
  - Available Data Sources
  - Connected Data Sources
  - Connection click handlers from that page
  - Mounted modal instances for Strava/Ford on that page
- Keep Apple Health visible and functional as the remaining connection surface in My Data.

5. Keep existing Strava/Ford code isolated, not broken
- Do not delete their modal components or edge-function integrations yet; only remove their exposure from the My Data UI layer.
- This keeps the change low-risk and reversible if those integrations need to return later.

6. Validation pass after implementation
- Verify Apple Health success still:
  - creates ACA records,
  - refreshes My Data,
  - shows the success state,
  - closes cleanly afterward.
- Verify the new animation does not overflow awkwardly on smaller screens.
- Verify Strava and Ford no longer render anywhere inside the My Data connections tab.

Technical details
- Primary files likely to change:
  - `src/components/AppleHealthModal.tsx`
  - `src/components/DataDashboard.tsx`
  - `src/components/psychometric/confetti.ts` (or a new shared animation helper if cleaner)
- Existing patterns already in the codebase support this well:
  - `canvas-confetti` is already installed and used
  - Apple Health success is already centralized in `connectionStatus === "connected"`
  - My Data connection rendering is currently hardcoded in `DataDashboard`, so hiding Strava/Ford is straightforward
