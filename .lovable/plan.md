## Problem

The "Sovereign Vault Required" nudge in `MainApp.tsx` only checks `profile?.wallet_address` (Supabase) to decide if a vault exists. If a user updates the app and Supabase profile row hasn't hydrated yet — or was never synced — but their local Keychain vault is intact, the nudge fires incorrectly. They open Security and see the wallet is still there.

## Fix

Make the nudge require BOTH signals to be missing (local Keychain AND remote Supabase), matching the dual-layer logic already used by `runVaultGuard` in `src/lib/vaultGuard.ts`.

### Change in `src/components/MainApp.tsx`

1. Import `walletService` from `@/services/walletService`.
2. Add a new `localVaultExists` state (default `null` = unknown).
3. In the profile/audit `useEffect`, additionally call `await walletService.hasWallet()` and store the result.
4. Update `showNudge` condition to require:
   - `!isProvisioned.wallet` (no remote wallet), AND
   - `localVaultExists === false` (Keychain confirmed empty — not just unknown).
5. Also listen for the existing `vault-linked` event (already handled) and flip `localVaultExists` to `true` so the nudge disappears immediately after provisioning.

This ensures the modal only appears when the vault is truly missing on both layers, preventing the false prompt after app updates.

No other behavior changes.