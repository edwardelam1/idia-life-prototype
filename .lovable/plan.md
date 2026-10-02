# Life challenge map — wave one

## Goal
Turn the Life **Overview** into an expandable, Afro-futurist progression map inspired by the attached reference, while leaving the Life page’s top tab bar and the other Life tabs unchanged.

## What will change

### 1. Rebuild the Overview header
- Remove the entire **Establish Your Standing** frame, including its assessment and NFC controls.
- Place the standing sphere directly below the Overview tab at the upper-left.
- Reduce the sphere from 170px to approximately 43px (75% smaller) and hide its two small captions at this compact size.
- Preserve the existing Life tab bar exactly as it is.

### 2. Create the expandable Life map
- Replace the current Overview body with a vertically scrollable, mobile-first journey map.
- Use the attached image as the visual reference, not as the app background: create a bespoke Life by IDIA environment with luminous woven paths, teal/amber energy, Afro-futurist architecture and nature, and the existing IDIA logo integrated as a landmark.
- Build the landscape in repeatable sections so later challenges can be appended without redesigning the map or imposing a fixed endpoint.
- Keep challenge controls as accessible interactive elements above the artwork, so they remain sharp, tappable, theme-aware, and maintainable.
- Show **only the challenge number** on every map stop. Locked, current, and completed states will be communicated visually without revealing challenge names on the map.

### 3. Add strict sequential progression
The numbers remain visible, but only the next available challenge can be opened. Completed challenges remain tappable; later challenges remain visibly locked.

1. **Assessment** — opens the existing psychometric assessment immediately.
2. **Connection** — opens a choice between the existing NFC Sync and a manual GUID entry. Manual GUID entry will use the authenticated connection resolver, reject invalid/self GUIDs, and create the same real accepted Connection and ACA record as the existing flow.
3. **Good Deed** — opens the existing evidence-backed Good Deed submission.
4. **Data Source** — takes the user to the existing Data page to attach one source.
5. **Proposal Vote** — takes the user to the existing Gov page to vote through the current on-chain flow.

### 4. Use real completion state only
No challenge will advance from a tap alone.
- Challenge 1 completes only after the assessment finishes and the trust-score request succeeds; persist an explicit per-user completion record because the existing trust score has a baseline and cannot prove assessment completion.
- Challenge 2 completes from an accepted row in `friends`.
- Challenge 3 completes from a verified row in `good_deeds`.
- Challenge 4 completes from an active row in `data_connections`.
- Challenge 5 completes from the authenticated user’s confirmed `dao_votes` record.
- Refresh progress when Life regains focus so actions completed on Data or Gov unlock the next stop when the user returns.

### 5. Finish wave one at the house
- Place the house as the destination after challenge 5.
- Once all five real completion conditions are satisfied, unlock and illuminate the house, then emit confetti from the house itself.
- Record the wave-one celebration per user so it does not repeatedly fire on every render; the completed house remains visibly active afterward.

## Technical details
- Add a focused `LifeChallengeMap` component and a small progress hook rather than expanding the already-large Life screen.
- Pass a typed navigation callback from the main app into Life for challenge 4 and 5; do not simulate Data or Gov actions inside Life.
- Add a minimal `life_challenge_progress` table only for state that has no trustworthy existing source (assessment completion and the one-time house celebration). Include explicit authenticated/service-role grants, strict `user_id = auth.uid()` RLS, and no PII.
- Extend the existing secure connection resolver for manual GUID submission instead of creating a parallel friendship path.
- Use semantic theme tokens, accessible numbered controls, safe-area-aware scrolling, reduced-motion behavior, and existing confetti utilities.
- Record the new component boundary and navigation contract in `AGENTS.md`, and update the roadmap.

## Verification
- Confirm the Overview shows the compact upper-left sphere and no Establish frame while the top Life tab bar is unchanged.
- Test locked/current/completed number states and strict 1→5 progression using real records only.
- Test assessment launch, NFC connection, manual GUID connection, Good Deed submission, Data navigation, and Gov navigation.
- Verify returning from Data/Gov refreshes progress, challenge 5 unlocks the house, and confetti fires once from the house.
- Check light/dark mode, reduced motion, and phone/desktop layouts; confirm build, runtime, console, and network logs are clean.
