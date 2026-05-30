## Goal

Make on-chain delegation calls fail loudly and early when the wallet isn't hydrated, and guarantee the signer used by `delegate` / `selfDelegate` is the telemetry-wrapped one from `walletService.getConnectedSigner()`.

## Scope

Single file: `src/services/governanceService.ts`. No changes to `walletService.ts`, no schema, no edge functions.

## Changes

1. **`delegate(delegatee)`** — replace the current body with the hardened version:
   - First guard: check `walletService.getRawWallet()` (the public accessor for `this.wallet`). If null, log `[CRITICAL] Wallet service has no wallet instance.` and throw `Wallet not initialized. Check your storage migration.`
   - Second guard: call `walletService.getConnectedSigner()` and throw `Signer could not be connected` if it returns null/throws.
   - Attach signer explicitly to the `IDIA_TOKEN_ABI` contract and send `delegate(delegatee)`.
   - Keep existing `tx.wait()` and `{ hash }` return shape.

2. **`selfDelegate()`** — keep delegating to `this.delegate(address)` (already correct), but read address from `walletService.getAddress()` and throw the same `Wallet not initialized` error if missing, so both entry points share one failure mode.

3. **`signAndRelaySelfDelegation()`** — leave logic intact; add the same `getRawWallet()` guard at the top so the gasless path surfaces the same `[CRITICAL]` log when storage migration hasn't populated the wallet.

No behavior change when the wallet *is* hydrated — only clearer errors and consistent signer sourcing.

## Why this is safe

- `walletService.getRawWallet()` already exists (line 285) and returns `this.wallet | null`, so we don't need to touch `walletService`.
- `getConnectedSigner()` already wraps `this.wallet.connect(provider)` with `[START]/[END]/[ERROR]` telemetry (lines 512-533), so callers get the Chrome DevTools trace described in your point 3 for free once they route through it.
- The current `delegate` already passes the signer into `new ethers.Contract(...)`, so we're tightening, not restructuring.

## Out of scope

- Capacitor / `capacitor.config.ts` — no edits needed; the debug hook is already enabled (`webContentsDebuggingEnabled: true`).
- `walletService.ts` migration logic — the guards surface migration failures but don't attempt to repair them.
