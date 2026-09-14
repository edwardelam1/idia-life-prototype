# Governance page: in-app Basescan view + auto-opening manual

Two changes on the Gov page.

## 1. Basescan link opens inside the app

Today the token link at the bottom of the teal IDIA card jumps to Basescan with no way back.

New behavior:
- On iPhone/Android, tapping it opens Basescan in an in-app browser sheet that slides over the app with a built-in Done button, returning straight to Governance.
- On the web preview, it opens a framed panel inside the app with a clear X / Close button and the Basescan page loaded in it. If Basescan refuses to display inside the frame, the panel shows the token contract address with a copy button and a single "Open Basescan in a new tab" link, so the user is never stranded.

## 2. Manual opens automatically on first touch of the Gov page

- The first time a user opens the Gov page (per account, remembered on the device), the read-only manual window opens by itself — no acknowledgement required, just the pages and a Close button.
- Existing behavior is preserved: the one-time "I Understand" acknowledgement gate still takes priority for accounts that have never acknowledged; the read-only auto-open only applies afterwards.
- A celebration burst — the same confetti used when a data connection succeeds — fires from the left and right edges of the manual window as it appears.

## Technical notes

- New `BasescanSheet` component in `src/components/governance/`. Native path uses `@capacitor/browser` (already installed, `presentationStyle: "popover"`); web path renders a full-screen overlay matching the existing modal styling (`rounded-[2rem]`, teal `hsl(178,42%,32%)` header) with an iframe plus a load-failure fallback card. `IdiaGovernanceCard` in `GovernanceScreen.tsx` swaps its `<a>` for a button that triggers the sheet.
- Auto-open uses the existing `ManualViewerModal`, mounted in `GovernanceScreen` with a `localStorage` key scoped by user id (e.g. `idia_gov_manual_seen_v1:<userId>`), gated so it does not fire while `needsWelcomeAck` is true.
- Confetti reuses `fireAppleHealthDataBurst` from `src/components/psychometric/confetti.ts`, fired once on open at two origins (`x: 0.08` and `x: 0.92`, `y: 0.6`).
- No changes to governance data, RLS, or edge functions.
