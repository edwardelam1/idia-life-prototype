# Challenge description pop-up

## Goal

When the user taps the **current active challenge** bubble on the Life map, a tiny pop-up appears describing what that challenge is. The pop-up is the gateway: it describes the challenge and offers the action to begin. Completed challenges keep launching their actions directly, and locked challenges stay non-interactive.

## Changes

### 1. Intercept the tap on the current challenge (LifeChallengeMap)

- When a bubble that is **current** (not yet complete) is tapped, do not call `onChallenge` immediately. Instead open a small pop-up anchored near that bubble.
- Completed challenges continue to call `onChallenge` directly with no pop-up.
- Locked challenges remain guarded and non-interactive, exactly as today.

### 2. The tiny pop-up

- A small, mobile-first card anchored above (or below, when near the top edge) the tapped bubble, using glassmorphism and the existing semantic theme tokens so it matches the map aesthetic in light and dark mode.
- Content per challenge — a short title plus one or two sentences:
  1. **Assessment** — "Complete your psychometric assessment to establish your standing."
  2. **Connection** — "Make a real Connection: sync with someone in person, or enter their GUID."
  3. **Good Deed** — "Submit a Good Deed you witnessed for verification."
  4. **Data Source** — "Attach one data source to your profile."
  5. **Proposal Vote** — "Vote on an active governance proposal."
- A clear action button ("Begin") that launches the existing flow via the current `onChallenge` path, and a subtle way to dismiss (tap outside, close affordance, Escape key).
- Accessible: anchored to the triggering bubble, announced to screen readers, keyboard reachable; reduced-motion friendly (no bounce animations when the OS requests it).
- Only one pop-up at a time; switching tabs or scrolling the map dismisses it.

### 3. Nothing else changes

- Challenge completion logic, sequential awareness, locked states, terrain, node positions, the house, and the achievement notice are untouched.
- No new data or database changes — the pop-up is static presentation copy.

## Technical detail

- Keep all pop-up presentation inside `LifeChallengeMap` (per the recorded architecture boundary: presentation in the map, action dialogs in `LifeScreen`). `onChallenge` is still called by the pop-up's action button, so `LifeScreen`'s `handleChallenge` and the existing dialogs/navigation stay unchanged.
- Positioning: computed from the tapped node's percentage coordinates inside the `aspect-[1/3]` map container, clamped so the card never overflows the rounded map frame on small phones.

## Validation

- Tap the current challenge: pop-up appears with the right description; "Begin" launches the existing flow; dismiss paths work.
- Tap a completed challenge: launches directly, no pop-up.
- Tap a locked challenge: no reaction.
- Check light/dark mode, small-phone layout, keyboard/reader access, and build/runtime logs.
