# Uniform Life challenge interactions

## Goal

Make challenges 1–5 feel like the same control while preserving the existing sequential challenge rules.

## Changes

- Give every numbered bubble the same behavior depending on if it is available, completed, or locked. at the moment 1, 2 and 3 don't behave like 4 and 5. 4 and 5 should not have any internaction because they're currently locked, 1 is the only challenge that should have any interactivity as it is the active challenge and no other challage is available or completed yet.
- Stop relying on the browser's disabled-button behavior for locked bubbles; it currently suppresses hover feedback and makes some stops feel different.
- Keep locked challenges non-actionable by guarding their click behavior and exposing their locked state accessibly. 
- Preserve the intended visual states: challenge 1 stays faded, challenges 2–5 keep their dark amber glow, and the current challenge may continue pulsing.
- Leave challenge completion logic, dialogs, map terrain, node positions, and the destination untouched.
- ensure this is mobile first.

## Validation

- Confirm all five bubbles animate identically on hover, keyboard focus, and press.
- Confirm locked bubbles do not launch a challenge.
- Confirm available and completed bubbles still open their existing actions.
- Check the project build and preview for errors.

## Technical detail

Use the existing shared map-node rendering path for all five controls. Represent unavailable nodes with `aria-disabled` plus an action guard instead of the native `disabled` attribute, while retaining a true loading lock during asynchronous progress loading.