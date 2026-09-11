# How to Generate Royalties Pop-up

## Goal
Add an educational pop-up that appears the first time a user taps the bottom **Data** tab, explaining how data-source connections translate into royalty payouts. Include a way to reopen the pop-up from the Data page.

## Requirements
- Trigger: bottom navigation **Data** tab.
- Frequency: show once per user/device; persist dismissal in localStorage.
- Reopen: small info/help button on the Data page reopens the modal.
- Content: explain tapping a connection, granting permissions/signing in, data flowing, and automatic USDC + IDIA Token royalty payouts when data is consumed from the IDIA Hub.

## Implementation Plan

### 1. Create `src/components/RoyaltyInfoModal.tsx`
- Use the existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`.
- Use `Button` from `@/components/ui/button`.
- Keep styling consistent with the app: semantic theme tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`), rounded-3xl corners, and the teal/orange accent palette already used in the Data tab.
- Content structure:
  - Title: "How to Generate Royalties"
  - Short intro sentence.
  - Step cards (icon + text):
    1. Tap a data source (Apple Health, Health Connect, FordConnect).
    2. Grant permissions or sign in to the linked account.
    3. Data flows automatically and securely.
    4. Earn USDC and IDIA Token royalties when your data is consumed from the IDIA Hub.
  - Primary CTA: "Got it" (dismisses and persists).
  - Secondary link-style CTA: "Learn more" (optional, can dispatch `showFriend` event with trigger `data`).

### 2. Wire the modal into `src/components/MainApp.tsx`
- Add state for `showRoyaltyInfo` and a `hasSeenRoyaltyInfo` check from localStorage keyed by user ID (`idia_royalty_info_seen_v1:<userId>`).
- Track the previous active tab; when the user switches **to** the Data tab and they have not yet seen the info, open the modal.
- Mark as seen when the modal is dismissed.

### 3. Add a reopen affordance in `src/components/DataDashboard.tsx`
- Add a small info/help icon button in the "Available Data Sources" section header.
- Clicking it dispatches a custom event or calls a callback to reopen `RoyaltyInfoModal` from `MainApp`.
- Prefer a window event (`showRoyaltyInfo`) so `DataDashboard` does not need to receive a prop through the tab router.

### 4. Persist dismissal
- Store `idia_royalty_info_seen_v1:<userId>` in localStorage when the user taps "Got it".
- Re-read the flag when the auth user becomes available so the modal does not reappear after refresh.

## Out of Scope
- No backend changes.
- No changes to connection logic, Apple Health, Ford, or Android Health Connect modals.
- No changes to royalty calculation or payout pipelines.

## Verification
- Type-check passes (`npx tsgo --noEmit -p tsconfig.app.json`).
- Preview: switching to the Data tab shows the modal once; dismissing it prevents reappearance; the info button reopens it.
