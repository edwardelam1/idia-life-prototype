Update the unauthenticated onboarding slide deck (LandingScreen.tsx) so the gradient slides fill the entire viewport and the text is positioned so the navigation arrows never overlap it.

1. Remove the blue header/footer frame
- Change the root container from the slate-900/800 gradient to a neutral background so the slide gradients become the only visible color.
- Make the carousel container absolutely positioned (`inset-0`) so each slide gradient bleeds all the way to the top, bottom, and edges of the screen.
- Keep the logo, navigation arrows, dot indicators, and "Get Started" button as absolute overlays on top of the gradient.
- Add safe-area-aware padding for the logo and bottom controls so they stay clear of notches/home indicators.

2. Raise and even out the slide text
- Change each slide's inner content from `justify-center items-center mt-32` to `justify-start pt-24` (or similar) so the title sits higher in the viewport and uses the top whitespace instead of floating in the middle.
- Keep the text horizontally centered with a `max-w-sm` width.
- Because the arrows are vertically centered in the full-height carousel, moving the title/description block into the upper third keeps it clear of the arrows while still leaving the bottom third for the CTA and dots.

3. Preserve behavior and contrast
- Keep the existing slide transitions, swipe/touch handling, arrow navigation, dot controls, and sign-up callback.
- Verify white text remains readable on the teal/emerald/green slide gradients.
- Adjust the bottom CTA spacing to sit just above the safe-area so it does not overlap the dot indicators.

4. Verify
- Preview the LandingScreen route in the browser and check on both mobile and desktop viewports that the gradient reaches the edges, the title is high enough, and the left/right arrows sit below or beside the title block, not on top of it.