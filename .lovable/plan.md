## Root cause

Your account has a **global wallet address** synced to Supabase (`0xc490…8c33`, visible in the console logs as `[HYDRATION_LOG] END: Successfully hydrated global state`), but the device has **no local wallet loaded** in secure storage. Concretely:

- `useWalletBalance` reads USDC/IDIA from the chain using the global address → that's why "Stable USDC 3.24" and "IDIA Token 700.00" render correctly.
- `useWallet` returns `wallet = null` because there is no seed phrase in this device's secure storage.
- In `EnhancedWalletDashboard.tsx` the entire ETH card, Voting Power card, and the new Self-Delegate button live inside `{hasWallet && wallet && ( … )}` (line 438). With `wallet === null`, that whole block never mounts — so the changes from the previous turn are present in the source but invisible in the UI.

That's why refreshing the preview, hard-reloading, and republishing all show the same thing: the code is shipped, the gate just never opens on this device.

## Plan

1. **Decouple ETH + Voting Power + Self-Delegate from local-wallet presence.**  
   Use `displayAddress` (already defined as `globalWalletAddress || localAddress`) as the source of truth so the UI renders for any account that has a synced wallet, including read-only / restored-on-another-device cases.

2. **Add a lightweight read-only ETH balance fetch** in `useWalletBalance` (or a small sibling hook) that calls `provider.getBalance(displayAddress)` against the Base Mainnet RPC already used for USDC/IDIA. Surface it as `balance.eth_balance` so the ETH (Gas) tile reads from the same hydration path as USDC/IDIA. No local key material required.

3. **Reuse the existing on-chain voting-power read** (Governor `getVotes(address)`) against `displayAddress` so the Voting Power tile and the "Activate Voting Power (Self-Delegate)" button render whenever there's an IDIA balance, regardless of whether the device holds the seed.

4. **Gate only the *signing* action, not the display.**  
   - Display ETH, Voting Power, delegatee, and the self-delegate button whenever `displayAddress` exists.
   - If `wallet` (local signer) is missing when the user taps "Activate Voting Power", show an inline prompt: *"This device doesn't hold the keys for this wallet. Import your recovery phrase to delegate."* with a button that opens the existing `WalletSetupModal` in `import` mode.

5. **Add a small "Wallet not on this device" banner** above the ETH tile when `globalWalletAddress` is set but `wallet` is null, with a one-tap "Import Recovery Phrase" CTA. This explains *why* signing is disabled while still showing the live balances.

6. **No backend / schema changes.** No edge-function or migration work. Pure frontend + one read-only RPC call.

## Files to touch

- `src/components/enhanced/EnhancedWalletDashboard.tsx` — move ETH / Voting Power / self-delegate out of the `hasWallet && wallet` gate; add the import-prompt banner; route the self-delegate button through a guard.
- `src/hooks/useWalletBalance.ts` — add `eth_balance` to the on-chain hydration call.
- `src/services/walletService.ts` *(read-only addition)* — add a `getVotesFor(address)` helper that works without a loaded signer, so Voting Power can render for the global address.

## Out of scope

- No changes to governance contracts, proposals, or the migration approved last turn.
- No changes to USDC/IDIA balance logic — already working.
- No PII or profile schema changes.
