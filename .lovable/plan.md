## Goal

Make the wallet's "Add Funds" flow adapt to which rails the user has actually provisioned:

- **Fiat rail provisioned** = a `wallets` row exists for the user (FBO is set up).
- **USDC rail provisioned** = `profiles.wallet_address` exists and starts with `0x` (sovereign wallet is set up).

Behavior:
- Both provisioned → modal shows both Debit Card / Credit Card (fiat) **and** USDC deposit options.
- Only fiat provisioned → modal shows only the fiat card options.
- Only USDC provisioned → modal opens directly into the USDC deposit view (no fiat options).
- Neither provisioned → "Add Funds" button is disabled with a tooltip / inline hint prompting setup.

## Changes

### 1. `src/components/AddFundsModal.tsx`
- Accept new props: `fiatEnabled: boolean`, `usdcEnabled: boolean`, `usdcAddress?: string | null`.
- Refactor the `select` step to conditionally render:
  - Fiat section (Debit / Credit cards) only when `fiatEnabled`.
  - New USDC deposit section only when `usdcEnabled`, showing:
    - Truncated wallet address with full-address copy-to-clipboard.
    - "Network: Base" label.
    - Note: "Send only USDC on Base. Other tokens/networks will be lost."
- Add a new step `'usdc-deposit'` (rendered as the QR/address view).
- If only one rail is enabled, skip the chooser and open directly into that rail's view.
- Keep all existing fiat card-add logic intact.

### 2. `src/components/enhanced/EnhancedWalletDashboard.tsx`
- Determine rail availability from existing hooks:
  - `fiatEnabled = !!walletBalance` (a `wallets` row was successfully fetched), or pass through a fiat-provisioned flag from `useWalletBalance`.
  - `usdcEnabled = !!globalWalletAddress && globalWalletAddress.startsWith('0x')` via `useSovereignWallet`.
- Pass `fiatEnabled`, `usdcEnabled`, and `usdcAddress` to `<AddFundsModal />`.
- If both are false, disable the "Add Funds" button and show "Set up wallet to add funds".

### 3. `src/components/WalletDashboard.tsx` (legacy)
- Same prop pass-through so the legacy dashboard stays consistent.

## Technical notes

- `useWalletBalance` already queries the `wallets` row; expose a derived `fiatProvisioned` boolean (true when the row was found) to avoid a second query.
- USDC address resolution reuses the same pattern as `SendRequestModal`: prefer `useSovereignWallet().globalWalletAddress`, fall back to `useWallet().wallet?.address`.
- No DB schema changes; no new edge functions.
- Respects no-mock-data rule — all rail signals come from real provisioning state.

## Files touched

- `src/components/AddFundsModal.tsx`
- `src/components/enhanced/EnhancedWalletDashboard.tsx`
- `src/components/WalletDashboard.tsx`
- `src/hooks/useWalletBalance.ts` (add `fiatProvisioned` flag)
