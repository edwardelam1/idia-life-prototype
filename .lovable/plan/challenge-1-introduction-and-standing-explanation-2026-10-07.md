# Challenge 1 introduction and Standing explanation

## Goal

Make the first Life challenge introduce the purpose of the journey before showing its existing challenge description, and let users tap the Standing sphere to understand what it represents.

## Changes

### 1. Add a seconadry pop-up for Challenge 1

- When Challenge 1 is the current active challenge and the user taps it, show an additional small pop-up beside the sphere, this is secondary to the original Challenge 1 pop-up and explains the function of the sphere.
- Give this secondary pop-up is entirely controlled by the primary Challenge 1 pop-up.
- Keep the current behavior for challenges 2–5, completed challenges, and locked challenges unchanged.
- Preserve outside-tap, Close, Escape, scroll, and tab-change dismissal behavior. Dismissing and reopening Challenge 1 starts again with “Set your standing first.”

### 3. Accessibility and presentation

- Keep both pop-ups inside `LifeChallengeMap`, using the existing glass treatment and semantic theme colors.
- Keep each pop-up immediately beside its trigger with an 8px lateral gap and vertical centering where space permits.
- Add clear screen-reader labels, keyboard activation, focus handling, Escape dismissal, and reduced-motion-safe transitions.

## Technical details

- Extend `StandingOrb` with an optional tap callback that distinguishes a tap from its existing pointer-drag interaction.
- Keep pop-up state and presentation in `LifeChallengeMap`; do not move assessment actions or completion logic.
- Model Challenge 1’s pop-up as two display stages: introduction, then existing challenge details.
- No database, completion-query, terrain, road, node-position, or navigation changes.

## Validation

- Tap active Challenge 1: “Set your standing first” appears beside it; tap Okay: Assessment details appear; tap Begin: existing assessment opens.
- Dismiss Challenge 1 during either stage and reopen it: the introduction appears first again.
- Tap the Standing sphere: its explanation appears beside it; Close, outside tap, and Escape dismiss it.
- Drag/flick the Standing sphere: it rotates without accidentally opening the explanation.
- Confirm only one pop-up is open at a time and challenges 2–5 retain their current behavior.
- Check the current phone viewport, light/dark modes, keyboard access, and build/runtime logs.