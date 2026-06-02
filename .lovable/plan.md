# Self-Delegate Onboarding + Readiness-Aware Button

Two scoped UI changes on the Wallet screen. No business logic or contract changes.

## 1. New modal: `SelfDelegateEducationModal`

**File:** `src/components/wallet/SelfDelegateEducationModal.tsx` (new)

Glassmorphic dialog (matches `NoWalletNudge` style — teal→amber gradient header, white card) with:

- Title: "Claim Your Voice"
- Body copy (verbatim from request):
  > "You've just added a wallet! To obtain governance power of the IDIA Protocol you must have at least 1 IDIA Token and Base ETH (Gas): ~0.0001 ETH (less than $0.05) to Self-Delegate.
  >
  > Self-Delegating is how you Claim Your Voice in the IDIA Protocol. Pressing the 'Self-Delegate' button after you have the necessary crypto assigns your voting weight to your wallet.
  >
  > You will be responsible for reviewing proposals and casting your own votes."
- Two requirement chips: `≥ 1 IDIA` and `≥ 0.0001 ETH (Base)`
- Buttons: "Got it" (dismiss) and "Go to Wallet" (dismiss + ensure overview tab + scroll to Self-Delegate button)

## 2. Trigger — once per wallet, after provisioning

**File:** `src/components/MainApp.tsx` (edit)

- Already listens for `vault-linked` events (dispatched from `handleCreateWallet`, `handleImportWallet`, and `vaultGuard.syncWalletToSupabase`).
- Add a sibling state `showSelfDelegateEdu` and set true on `vault-linked`, gated by `localStorage` key `idia_self_delegate_edu_seen_v1:<address>` so each new wallet sees it once.
- Render `<SelfDelegateEducationModal />` alongside `NoWalletNudge`.
- On dismiss: write the localStorage flag.

## 3. Readiness-aware Self-Delegate button

**File:** `src/components/enhanced/EnhancedWalletDashboard.tsx` (edit lines ~615–625)

Compute three booleans from already-available `balances` and `delegatee`:

- `hasIdia = Number(balances?.idia?.balanceFormatted ?? 0) >= 1`
- `hasGas = Number(balances?.eth?.balanceFormatted ?? 0) >= 0.0001`
- `isSelfDelegated = delegatee?.toLowerCase() === wallet?.address?.toLowerCase()`

Button states (single button, no logic change to `handleDelegateVotes`):

| State | Label | Style | Disabled |
|---|---|---|---|
| Already self-delegated | "Re-Delegate to Self" | `variant="outline"` (current) | no |
| Ready (`hasIdia && hasGas`, not delegated) | "Self-Delegate — Claim Your Voice" | filled gradient (teal→amber), subtle pulse ring | no |
| Not ready | "Self-Delegate (need ≥1 IDIA & ~0.0001 ETH)" | `variant="outline"` muted | no (still clickable — `handleDelegateVotes` already toasts insufficient-funds errors gracefully) |

Add a small helper line under the button only in the "Not ready" state listing the missing item(s): e.g. "Missing: 0.7 IDIA, 0.00009 ETH". Use existing text-muted-foreground tokens.

## Out of scope

- No change to `governanceService`, `useWallet`, `relay-*` edge functions, or contracts.
- No change to `ActivateVotingPowerCard` in the Governance screen (covers same flow there separately).
- No new env vars, secrets, or migrations.

## Verification

1. Fresh user creates a wallet → modal appears once; reload → not shown again.
2. Import existing wallet → modal appears once for that address.
3. Wallet with 0 IDIA / 0 ETH → button shows "need ≥1 IDIA & ~0.0001 ETH" + missing summary.
4. Wallet with 1 IDIA + 0.0001 ETH (not delegated) → button switches to gradient "Claim Your Voice" state.
5. After successful self-delegation → button reads "Re-Delegate to Self".
