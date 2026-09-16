# Infinite Data Source Carousels

## Goal
Turn both **Available Data Sources** and **Active Streams** into separate, frameless horizontal carousels of floating circular source icons.

## Experience
- Sort each row alphabetically by its displayed source name.
- Auto-scroll smoothly at a calm, constant speed.
- Repeat seamlessly in both directions without a visible start, end, container, border, or background.
- Allow touch swiping, mouse dragging, trackpad scrolling, and momentum scrolling in either direction.
- Pause automatic movement while hovered, focused, pressed, or dragged; resume gently afterward.
- Preserve every icon's existing click behavior, labels, status indicators, and connection modal.
- Keep the existing empty and “all connected” messages when a row has no source circles to show.
- Respect reduced-motion settings by disabling automatic movement while retaining manual horizontal scrolling.

## Implementation
- Add a small reusable carousel component for both rows so their motion and looping behavior stay consistent.
- Render repeated copies of each alphabetized source list and silently recenter the scroll position when it crosses a loop boundary, producing an endless path without a visual jump.
- Use fixed-width source items and hidden scrollbars so labels and status badges cannot resize or shift the carousel.
- Distinguish a swipe/drag from a tap so moving the carousel never accidentally opens a source modal.
- Preserve keyboard access and descriptive labels for each source.

## Scope
- Frontend presentation and interaction only.
- No changes to connection logic, OAuth flows, consent artifacts, lifestyle data, or the health pipeline.

## Verification
- Check both rows on mobile and desktop for smooth continuous movement, bidirectional swipe/drag, alphabetical order, seamless looping, and correct icon taps.
- Confirm the rows have no visible frame or scrollbar and do not clip source labels or active-stream badges.
- Confirm reduced-motion mode remains manually scrollable without auto-scrolling.
