# Royalties pop-up styling and full-screen video

## Match Welcome to Life
- Restyle **How to Generate Royalties** to match the Welcome to Life pop-up: same maximum width, rounded corners, spacing, translucent frosted panel, blurred backdrop, amber border/glow, and teal accents.
- Match the centered title arrangement, small amber brand label, bold heading, and supporting text sizing.
- Present the existing four steps as left-aligned rows with teal circular icons and subtle dividers, matching the Life feature list.
- Keep the existing text, video, and **Got it** action; style the action like the Welcome to Life button.
- Keep the panel within available screen space, scrolling when necessary, with light/dark theme support and safe-area spacing.

## Tap video to enlarge
- Tapping the video opens a full-screen, video-only view—not an enlarged version of the entire pop-up.
- Show the complete video without cropping, against a theme-aware dark video backdrop.
- Place an accessible **X** at the top-right, clear of device safe areas. It returns to the royalties pop-up without dismissing it or marking it as seen.
- Preserve playback position when expanding and returning; keep playback muted, looping, and inline with the existing autoplay safeguards.
- Escape returns from the expanded video first; restore focus to the video opener. Normal pop-up dismissal remains unchanged.

## Technical scope
- Keep changes focused on `RoyaltyInfoModal` and any minimal presentation helper needed for its full-screen video view.
- Use the existing theme tokens and Button component; do not change shared dialog defaults or the Welcome to Life pop-up.
- Use an app-controlled full-screen overlay so the X/return behavior works without relying on native browser full-screen support.
- Preserve the existing first-visit/reopen behavior and uploaded MP4. No changes to data sources, health, royalties, encryption, or native code.

## Verification
- Compare the two pop-ups at phone and desktop sizes in light and dark modes.
- Open the royalties pop-up, tap the video, confirm only the video fills the screen, then press X and confirm the original pop-up returns with playback position retained.
- Check keyboard opening, Escape, focus restoration, safe-area placement, scrolling, and current build diagnostics.
- Verify muted autoplay and full-screen return on a real iPhone separately if device testing is unavailable here.