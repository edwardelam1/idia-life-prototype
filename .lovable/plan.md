# Life map — handcrafted rebuild, one element at a time

## Goal

Replace the mismatched generated images with one continuous, handcrafted vector environment. Each visual layer will be built and approved separately so scale, alignment, and direction remain consistent.

## Phase 1 — road and terrain only

This is the only phase to implement now.

- Remove the three generated map images from the rendered Life map.
- Build one continuous vertical SVG coordinate space inside `LifeChallengeMap`, so there are no image seams or independent scales.
- Handcraft the base terrain from vector shapes: deep jungle ground, river/waterfall channels, banks, stone contours, and restrained teal/amber atmosphere.
- Draw one uninterrupted road through that same coordinate system. Its centerline, width, curves, and future extension points will be mathematically continuous from bottom to top.
- Reserve measured anchors for the five challenge stops and destination, but do not redesign the bubbles, vegetation, architecture, or house in this phase.
- Keep the current challenge controls and real progression behavior working while the visual layers are rebuilt.
- Keep the compact standing sphere and Life tab bar unchanged.

## Review checkpoint

After phase 1, stop and present the road-and-terrain foundation for review. No second visual element will be added until this foundation is approved.

The review will check:

- The environment reads as one fluid composition at the current phone size.
- The road has no seams, jumps, or scale changes.
- All five reserved stop anchors sit directly on the road.
- The top and bottom extension points share a fixed width and center, allowing later sections to continue without redesign.
- The 15% outer curve clips the complete environment cleanly.

## Later phases — not included in this build

Each later phase requires a separate review before the next begins:

1. One challenge clearing and one bubble style.
2. Repeat and vary the approved clearing for all five stops.
3. Vegetation and Afro-futurist environmental details.
4. The IDIA house and its destination interaction.
5. Lighting, depth, motion, and final polish.

## Technical details

- Use custom inline SVG and semantic theme tokens only; no generated bitmap artwork.
- Keep the reusable map configuration and presentation in `LifeChallengeMap`.
- Define the road geometry and anchor coordinates once, then derive visible stop placement from those same coordinates.
- Preserve existing accessibility, reduced-motion behavior, sequential completion rules, dialogs, cross-tab navigation, and one-time celebration logic.
- Record the vector-only, shared-coordinate map architecture after phase 1 is approved and implemented.
