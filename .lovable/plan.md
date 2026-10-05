# Place the challenge pop-up beside its bubble

- Move the current-challenge pop-up directly beside the tapped bubble, with an **8px horizontal gap** between their edges.
- Vertically center the pop-up on the bubble instead of placing it above or below.
- Use whichever side has more room and adapt its width on narrow screens so it stays inside the map without covering the bubble.
- Preserve all descriptions, Begin/Close actions, dismissal behavior, and challenge progress rules.

## Technical details

Keep placement in `LifeChallengeMap`, using the shared node coordinates and the bubble’s actual rendered dimensions. Remove the current percentage-based vertical offset.

## Validation

Check bubble-to-pop-up spacing and vertical alignment at narrow and wide widths; confirm the app remains error-free. Leave no temporary testing materials behind.
