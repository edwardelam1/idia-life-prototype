# Welcome to Life overlay

## Goal
Show a one-time introduction when a user first opens the Life page, without changing the map, challenges, or existing Life workflows.

## Experience
- Present a centered, mobile-first glass overlay titled **“Welcome to Life”** after the Life page finishes loading.
- Briefly introduce the five existing areas: Overview and challenges, Connections, Sphere of Life, Trust Circles, and witnessed Good Deeds.
- Keep the copy concise and readable in light and dark modes using the existing Life teal/amber visual language.
- Include an **Okay** button. Also dismiss when the user taps the dimmed area outside the panel.
- Support Escape and move keyboard focus into the overlay for accessibility; taps inside the panel will not dismiss it.

## First-visit behavior
- Record dismissal locally with a key scoped to the signed-in user, so each user sees it only once on that device/browser.
- Do not write personal information or new records to the database.
- Mark the overlay as seen for either dismissal method, then restore normal Life page interaction immediately.

## Architecture
- Add a focused Life welcome presentation component under the existing Life components.
- Let `LifeScreen` own first-visit state and render the overlay, preserving the established boundaries for the map, challenge completion, and cross-tab navigation.
- Do not alter the handcrafted Life map, health integrations, data refresh behavior, or challenge logic.

## Verification
- Confirm the overlay appears on a fresh first visit, dismisses through **Okay** and outside tap, and stays dismissed after revisiting/reloading.
- Check phone-sized and desktop layouts, light/dark readability, keyboard focus/Escape behavior, and the project build.
