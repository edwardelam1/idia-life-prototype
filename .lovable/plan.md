# Fix "No wallet loaded" on Pending proposal cancel

## Why the relayer can't do this (the transferFrom question)

`Governor.cancel(targets, values, calldatas, descriptionHash)` from OpenZeppelin has a hard rule for **Pending** proposals: `msg.sender` must equal the original `proposer` address (or the contract's guardian, which we haven't configured). There is no allowance/approval primitive like `transferFrom` — the proposer cannot grant the relayer the right to cancel on their behalf without redeploying the Governor with a custom role. That's exactly why we moved cancel client-side last round, and why the relayer attempt failed before that.

So the only correct path is: sign with the proposer's own wallet on-device. The bug is that the wallet isn't loaded into memory yet when the user taps Cancel, not that we picked the wrong signer.

## Root cause

`walletService.getConnectedSigner()` → `getSigner()` throws `"No wallet loaded"` when `this.wallet` is null. The wallet only populates after `walletService.loadWallet()` reads the mnemonic out of the Secure Enclave. On the Governance tab — especially after a cold reload or a tab switch where the in-memory wallet was cleared — the user can have a wallet on disk but nothing in `walletService`, and the cancel button hits this immediately.

## Fix

Edit `src/components/governance/ActiveProposalsList.tsx` → `handleCancelPending`:

1. Before calling `getConnectedSigner()`, check `walletService.getAddress()`. If null, `await walletService.loadWallet()`.
2. If `loadWallet()` returns null (Secure Enclave empty / biometric refused), surface a clear toast: "Wallet locked — open Wallet tab to unlock, then retry cancel." and bail without throwing into stage telemetry as a hard error.
3. Re-check `getConnectedSigner()` after the load. Keep the existing `sameEvmAddress` proposer guard.
4. Apply the same lazy-load guard to the in-dialog cancel button path (same function, so one fix covers both call sites at lines 879 and 966).

No backend, no relayer, no schema changes. UI/wallet-bootstrap only.

## Out of scope

- Re-introducing a relayer-signed cancel. Not possible with the current Governor without a guardian role; would require a contract change.
- Changing Secure Enclave / biometric prompt behavior.
