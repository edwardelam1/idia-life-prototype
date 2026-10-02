# Progressive Life map refinement

## Goal

Turn the Life Overview into a genuinely expandable Candy Crush-style journey rather than a single fixed poster with controls floating over it.

## What will change

### 1. Replace the fixed map artwork with reusable map sections

- Redesign the current single image as a modular vertical environment made from reusable start, journey, and destination sections.
- Render the sections from challenge configuration so future numbered stops can be appended without rebuilding the page or replacing one monolithic image.
- Keep the illuminated jungle, teal/amber energy, woven path, waterfalls, and Afro-futurist IDIA house, while making the visual transitions between sections seamless.
- Keep the current five-stop wave ending at the house; future waves can add journey sections and move the destination forward.

### 2. Integrate the challenge bubbles into the landscape

- Replace the flat transparent hit areas with dimensional Candy Crush-style bubble medallions that visually belong to each stone clearing.
- Precisely recalculate all five positions against the artwork: 1–4 centered inside their clearings and 5 moved down into the center of its clearing.
- Preserve accessible interactive controls, but make their visible surfaces feel painted and illuminated into the map rather than layered UI.
- Apply the requested number treatment: 1, 2, and 3 white and faded; 4 and 5 black with a glow.
- Continue showing only the numbers, with no challenge names on the map.

### 3. Remove and refine

- Remove the square Hub logo completely from the map.
- Round the image/map boundary to a 15% radius and clip all artwork and interactions cleanly to that silhouette.
- Preserve the compact standing sphere, the existing Life tab bar, all real completion rules, and every challenge action.

## Technical details

- Keep presentation in `LifeChallengeMap` and keep completion data in `useLifeChallengeProgress`.
- Define reusable map-section and node configuration objects so adding later challenges is data-driven.
- Keep semantic theme tokens, reduced-motion behavior, and large invisible touch targets behind the integrated visual bubbles.
- Keep the pictured house itself as the final interactive target and retain one-time confetti behavior.

## Verification

- Inspect the mobile layout at the current phone size and confirm every number is centered in its intended clearing.
- Confirm 1–3 are faded white, 4–5 are glowing black, and no square Hub logo remains.
- Confirm the 15% curved boundary clips the complete visual cleanly.
- Confirm locked/current/completed interactions still work without shifting the artwork.
- Confirm an additional journey section and challenge node can be added through configuration without redesigning the first wave.
- Check light/dark mode, reduced motion, build output, runtime errors, and console errors.
