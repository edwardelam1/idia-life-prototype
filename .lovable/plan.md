# Welcome Sequence — Light Aesthetic Refresh

Convert `src/components/life/WelcomeSequence.tsx` from the current dark/black palette to the project's Glossy Light Theme (Trust-Blue + Amber, glassmorphism, soft pearl backdrop). No structural or copy changes — only visual styling.

## Changes (single file)

`src/components/life/WelcomeSequence.tsx`

- **Root container**: replace `bg-black text-white` with a layered light backdrop:
  - Soft radial gradients of pale sky-blue and warm amber/cream over a near-white base, matching the rest of the app's glossy light theme.
  - Default text color: `text-slate-800`.
- **Skip button**: white glass pill (`bg-white/70`, `border-slate-300/70`, `text-slate-700`, subtle shadow).
- **Step 1 (Materialization)**:
  - Central orb: warm white core with teal + amber halo (lower opacity to read on light bg).
  - Particles keep teal / amber / orange but with reduced glow to suit a light field.
  - Headline gradient swapped to deeper hues (`from-teal-600 via-amber-500 to-orange-500`) for contrast.
  - Body text uses `text-slate-700` / `text-slate-600`; emphasis line uses `text-amber-600`.
- **Step 2 (IDIA Protocol)**:
  - Connector lines stay teal→amber but at higher opacity for readability.
  - Center logo halo: white glass card (`bg-white/80`, `border-slate-200`, soft indigo glow).
  - Pillar pills: `bg-white/80`, `border-slate-200`, `text-slate-800`, soft teal shadow.
  - Heading `text-amber-600`; pillar names `text-teal-600`.
- **Step 3 (Spotlight Tour)**:
  - Dimmer changed from black to a frosted light scrim — radial transparent center fading to `rgba(255,255,255,0.85)` with backdrop blur, so the underlying nav is gently veiled, not blacked out.
  - Spotlight ring: teal stroke + amber outer glow on light field.
  - Caption card: white glass (`bg-white/85`, `border-slate-200`, shadow), slate text, amber label.
  - Progress dots: active `bg-teal-500`, inactive `bg-slate-300`.
  - "Next" button: `bg-teal-500 text-white hover:bg-teal-400`.
- **Step 4 (Sovereignty Shield)**:
  - Halo softened to teal/amber on white. Inner badge: white glass with teal shield icon (`text-teal-600`).
  - Heading `text-amber-600`; emphasis line `text-teal-600`; body `text-slate-700`.
- **Step 5 (Final Launch)**:
  - Heading gradient `from-teal-600 via-amber-500 to-orange-500`.
  - START button keeps the bright teal→amber→orange gradient (already light-friendly), text remains dark slate, glow slightly dialed down for the new background.
- **ContinueButton helper**: white glass pill, `text-slate-700`, `border-slate-300`, hover `bg-white`.

## Out of scope

- No copy changes. No layout/sequence changes. No edits outside this file.
- Logging, step flow, spotlight rect math, and `localStorage` gating remain identical.

## Acceptance

- The overlay reads as a glossy, airy light surface consistent with the rest of IDIA Life.
- All text passes basic contrast on the new light backdrop (slate-700/800 body, teal-600 / amber-600 accents).
- Spotlight tour still aligns to the bottom-nav icons with a visible glowing ring on the light scrim.
