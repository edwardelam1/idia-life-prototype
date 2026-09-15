# Authorize an imported wallet for Hub purchases

## The problem

When a wallet is **created** in Life, it automatically goes through a one-time setup: a small gas top-up, then two on-chain approvals (one for the relayer, one for the Synapse Credits vault) and self-delegation for voting.

When a wallet is **imported** into Life, none of that happens. The wallet works for balances and transfers, but it has never approved spending for credit purchases — so when the user carries that wallet to hub.thebigidia.com, the Synapse Credits purchase fails as "not authorized". That is exactly the state of the wallet currently stuck on-chain.

## What gets added

A **Wallet Authorization** card in the Security tab of the wallet page, in the wallet management area (just under the wallet address block).

The card shows the current state at a glance:

- **Authorized** — green check, "This wallet can purchase Synapse Credits on the Hub."
- **Not authorized** — amber warning, with an **Authorize Wallet** button.
- **Checking** — while the on-chain approvals are being read.

Pressing **Authorize Wallet** runs the same setup a new wallet gets, with live step labels:

```text
Checking gas  ->  Authorizing relayer  ->  Authorizing credits vault  ->  Enabling voting power  ->  Done
```

On success the card flips to Authorized and a confirmation toast appears. On failure the card stays amber and shows a plain-language reason with a Retry button.

Handled edge cases:

- **Account linked to a different wallet.** The gas top-up service only serves the wallet recorded on the account, so if the imported wallet isn't the linked one, the card asks the user to press the existing "Use IDIA Wallet for My Account" button first, and the Authorize button stays disabled.
- **No gas and top-up unavailable** (already used once for this wallet): the card explains the wallet needs a small amount of ETH on Base to complete authorization, and offers Retry once funded.
- **Already approved**: nothing is re-broadcast; the card just reads Authorized.

## Technical notes

- `src/services/walletService.ts`
  - Add `getAuthorizationStatus()`: reads `USDC.allowance(wallet, relayer)` and `USDC.allowance(wallet, SynapseVault)` on the active Base network, plus `IDIA.delegates(wallet)` and the wallet's ETH balance. Returns `{ relayerApproved, vaultApproved, selfDelegated, hasGas, relayerAddress }`. The relayer address comes from the `wallet-gas-drip` response; add a lightweight resolution path so status can be read without broadcasting (call the function and use `relayer_address` from its reply, tolerating the "already dripped" case).
  - Add `authorizeExistingWallet(onStage)`: reuses the existing provisioning steps but skips any step already satisfied — no drip if funded, no approve if allowance is already max, no delegate if already self-delegated. Same `ProvisioningStage` values and `[WALLET_PROVISION]` telemetry.
- `src/hooks/useWallet.ts` — expose `authorizationStatus`, `refreshAuthorization()`, and `authorizeWallet()` alongside the existing `provisioningStage`.
- `src/components/enhanced/EnhancedWalletDashboard.tsx` — new card inside the `security` TabsContent, below the address block, reading the hook state; disabled while the linked-wallet mismatch warning is showing.

No database or edge-function changes; no Swift/native changes. Verified after the change with a type-check and build.
