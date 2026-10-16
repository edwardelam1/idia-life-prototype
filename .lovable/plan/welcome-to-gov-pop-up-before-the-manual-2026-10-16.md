# Welcome to Gov pop-up (before the manual)

## Experience

- On a user's first visit to the Gov page, show a "Welcome to Gov" pop-up first, styled like Welcome to Life and the royalties pop-up: same size, frosted glass, amber border glow, teal icons, small amber "Life by IDIA" label above a centered title.
- Short outline of the Gov page areas, one row each with an icon:
  - IDIA Token: your governance balance, verifiable on Basescan.
  - Jurisdiction: switch between the Wyoming DUNA and Delaware portals.
  - Hats: the roles you hold in the DAO.
  - Decentralized Community Grant Pools: live on-chain local funding pools.
  - Proposals: review, vote 1:1, and submit when eligible.
- Dismiss with an **Okay** button, by tapping outside, or with Escape.
- As soon as it's dismissed, the Welcome Manual opens:
  - New users (manual not yet acknowledged): the required "I Understand" manual appears next.
  - Users who already acknowledged it: the read-only manual opens with the existing confetti, as it does today.
- Shown once per user on each device; nothing new is saved to the database.

## Technical details

- New `src/components/governance/WelcomeToGovOverlay.tsx`, reusing the WelcomeToLifeOverlay structure and tokens.
- `GovernanceScreen` adds `showGovWelcome`, keyed `idia_gov_welcome_seen_v1:<userId>` in localStorage, set once `userId` is known.
- Render `WelcomeManualGate` and the auto-open manual effect only after `showGovWelcome` is false; existing manual keys and logic stay as they are.
- Check phone and desktop sizes in light and dark mode, then confirm the order: pop-up first, manual next.