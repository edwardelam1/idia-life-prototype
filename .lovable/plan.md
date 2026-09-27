# Fix wallet "Waiting for gas" and the Gov page Basescan links

## 1. Authorization stuck on "Waiting for gas" (0x4B813de...66e1)

What the data shows:
- The wallet is correctly registered to its account and has never received the one-time gas drip (no drip record exists for it).
- Today's drip logs show requests only for a different wallet (0x429F...5A40, another account); none reached the drip service for 0x4B81.
- The app currently swallows any drip error (wrong wallet, service failure, empty treasury) and then silently waits 30 seconds, so the screen says "Waiting for gas" whatever the real cause.

Exact cause is not yet confirmed, so the fix is diagnose-then-repair:
- Stop hiding the drip response: if the drip service refuses or fails, show the real reason immediately (wallet mismatch, already funded, treasury empty, network error) instead of waiting.
- Add explicit BEGIN/END logs to the drip service for every outcome (mismatch, guard hit, treasury balance before send, broadcast hash, failure).
- Have the drip service check the treasury's ETH balance before sending and return a clear "treasury empty" error.
- Wait for the drip transaction receipt (by hash) rather than blindly polling the balance for 30 seconds; extend to 60 seconds.
- Then retry authorization on 0x4B81 and read the logs to confirm the real cause and the fix.

## 2. Basescan links on the Gov page do nothing

- The IDIA token link uses one method; the Community Grant Pool cards use a plain new-tab open, which the iPhone app shell blocks silently.
- Route both through the same Basescan opener (token and address pages), so both behave identically.
- In the iPhone shell, send the link to the native app through its message channel (falling back to page navigation), since the current page-navigation approach is not being picked up; Android keeps the in-app browser sheet; web keeps the new tab.

## Technical details

- `walletService.authorizeExistingWallet`: treat `dripError` / non-2xx as terminal with parsed message (`WALLET_MISMATCH`, `WALLET_ALREADY_FUNDED`, `TREASURY_EMPTY`); use `provider.waitForTransaction(hash, 1, 60000)` when a hash is returned; surface in `HubAuthorizationGate`.
- `wallet-gas-drip`: `publicClient.getBalance(treasury)` guard, BEGIN/END logs, no upserts (existing SELECT-then-INSERT kept). Redeploy.
- `BasescanSheet.openBasescan(target, kind: "token" | "address")`; iOS shell path: `window.webkit.messageHandlers.openExternal?.postMessage({ url })` then `location.assign(url)` fallback. `LocalizedPoolsDisplay` calls it instead of `window.open`.
- Open question: the native message-handler name in the custom ContentView (assumed `openExternal`); if it differs, the Swift side needs a matching handler.
