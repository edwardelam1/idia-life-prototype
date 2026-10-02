# Life-only achievement notice

## Goal
Show a bold, framed **Life Achievement Unlocked** notice only on the Life page when the current sequential challenge becomes complete.

## Behavior
- Detect a real false-to-true completion after Life progress has finished loading; do not show the notice for previously completed records during initial page load.
- Respect strict sequence awareness, so completion records from later challenges cannot trigger the notice before their turn.
- Display the notice above the Life page content in a prominent framed space without changing the map, tabs, dialogs, or progression rules.
- Automatically dismiss it after five seconds.
- Dismiss immediately on tap with a short pop animation.
- Support horizontal swipe dismissal in either direction, with the notice tracking the gesture and sliding off toward the chosen side.
- Keep the interaction mobile-first, keyboard accessible, safe-area aware, and reduced-motion friendly.

## Implementation
- Add a focused Life achievement notice component using pointer events for touch, pen, and mouse input.
- Keep notice state and sequential transition detection inside `LifeScreen`, so it cannot appear on Wallet, Data, Gov, Shop, or Pro.
- Compare the previously visible sequential progress with refreshed progress and trigger once for each newly reached challenge.
- Clear timers and gesture state when the notice closes or Life unmounts.
- Use the existing semantic theme tokens and button/control patterns.

## Validation
- Complete challenge 1 and confirm the notice appears once.
- Confirm later pre-existing records stay silent until their challenge becomes current and completes.
- Confirm five-second timeout, tap pop, left swipe, and right swipe dismissal.
- Confirm no notice appears elsewhere in the app or on initial Life loading.
- Check phone-sized layout, reduced motion, type checking, build output, and runtime logs.
