## Goals

1. **Request Money screen** — replace the hard-coded `IDIA-wallet-***4829` mock with the user's real USDC wallet address.
2. **Wallet → Security tab** — remove the disconnected "Authenticate Identity" button and replace it with a "Recovery Phrase" (pass phrase) reveal section, alongside the existing wallet address.

No database changes. No new dependencies. Pure UI/wiring work.

---

## 1. SendRequestModal — real wallet address

**File:** `src/components/SendRequestModal.tsx`

- Pull the live wallet address using the same source as the Wallet dashboard:
  - `useSovereignWallet(profile?.id)` → `globalWalletAddress`
  - Fallback to `useWallet()` → `wallet?.address` (native local address)
  - Use `useEnhancedProfile()` to get the stable user id
- Replace the hard-coded `IDIA-wallet-***4829` label and the `IDIA-wallet-abc123def456` clipboard payload with the resolved address.
- Truncate for display (e.g. `0x1234…ABCD`) but copy the full address.
- If no address yet (wallet not provisioned), show a small "No wallet linked yet" hint instead of the QR/copy block.
- Keep existing copy-to-clipboard toast behavior.

## 2. EnhancedWalletDashboard — Security tab cleanup

**File:** `src/components/enhanced/EnhancedWalletDashboard.tsx` (lines ~500–531)

In the `isProvisioned` branch of the Security tab:

- **Remove** the `Authenticate Identity` button (the simulated `AUTH_HANDSHAKE` block).
- **Keep** the wallet address card ("Global Vault Attached" + `displayAddress`).
- **Add** a new "Recovery Phrase" subsection beneath it with:
  - A short description: "Your 12-word phrase is the only way to restore this wallet. Never share it."
  - A primary button **"Reveal Recovery Phrase"** that opens the existing `WalletSetupModal` in `view-seed` mode (the modal already supports this — `setSetupMode('view-seed'); setIsSetupModalOpen(true);`).
  - This reuses the existing seed-reveal flow used elsewhere in the app, so no new reveal UI is built.
- Remove the now-unused `Fingerprint` import if no other reference remains.

## Technical notes

- `WalletSetupModal` already accepts `mode: 'create' | 'import' | 'view-seed'` and handles loading + display of the seed phrase via `getSeedPhrase()` — already wired in `EnhancedWalletDashboard`.
- `useSovereignWallet` returns the canonical EVM/USDC address persisted to Supabase; `useWallet` provides the native (Secure Enclave) fallback. Same precedence as the Security tab uses today.
- No PII or schema changes. No RLS impact. No edge functions touched.

## Files to edit

- `src/components/SendRequestModal.tsx`
- `src/components/enhanced/EnhancedWalletDashboard.tsx`

## Out of scope

- Generating QR codes for the address (current screen only shows a QR icon, not a real QR).
- Any change to wallet creation, import, or seed storage logic.
