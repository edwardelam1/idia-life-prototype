# Answer the Hub's authorization hand-off

When someone tries to buy Synapse Credits in The IDIA Hub with a wallet that has never been authorized, the Hub will send them to IDIA Life. Life must catch that hand-off, set the wallet up, and drop the person straight back where they were in the Hub.

## What the user experiences

1. In the Hub they tap "Authorize wallet". The Life app opens.
2. Life shows a single focused screen: "The IDIA Hub wants to authorize your wallet", with the wallet address and a large "Authorize" button.
3. If they aren't signed in, Life asks them to sign in first and then continues the authorization on its own — no need to start over in the Hub.
4. If they have no wallet yet, Life walks them through creating or importing one, then continues.
5. Progress is shown in plain steps (Checking gas, Authorizing, Done), the same wording used on the wallet Security tab.
6. On success Life returns them to the Hub address supplied in the link, with a success marker. On failure or cancel, it returns them with a short reason so the Hub can explain what happened.

## Edge cases

- The wallet the Hub names is not the wallet in Life: show both addresses, explain they don't match, and offer "Authorize my Life wallet instead" or "Go back to the Hub".
- Already authorized: skip straight to the success return, with a brief "Already authorized" note.
- No ETH for fees and the one-time top-up was already used: explain the wallet needs a small amount of ETH on Base, with a Retry button and a "Back to the Hub" link.
- Return address not on the allowed list: complete the authorization but stay in Life and show a success message instead of redirecting.

## Technical section

**Incoming link**
`idialife://authorize-relayer?owner=<address>&relayer=<address>&return=<url>`
Plus the browser fallback `https://<life-host>/?authorizeRelayer=1&owner=…&relayer=…&return=…` for cases where the scheme doesn't resolve.

Two entry paths, because iOS runs a custom ContentView shell and Android runs Capacitor:
- Android: existing `appUrlOpen` listener in `src/App.tsx` — add an `idialife://authorize-relayer` branch before the OAuth fragment logic.
- iOS custom shell and web: parse `window.location.search` on mount and also listen for the shell's existing URL-delivery path (same mechanism the Ford callback uses), so no Capacitor dependency is introduced.

Both paths normalize into one payload and dispatch `idia:authorize-relayer`.

**New file `src/components/wallet/HubAuthorizationGate.tsx`**
Full-screen overlay mounted from `src/App.tsx`, listening for that event. State machine:
`idle → needs_auth → needs_wallet → confirm → authorizing → success | error`.
- Auth: if `useAuthUser` has no user, persist the payload to `localStorage` (`idia_hub_authz_pending_v1`) and route to `/auth`; on mount, if a pending payload exists and a user is present, resume automatically. Payload expires after 15 minutes.
- Wallet: reuse `WalletSetupModal` for create/import; resume on completion.
- Authorization: call `walletService.authorizeExistingWallet(onStage)` (already implemented, skips satisfied steps), reusing `AUTHORIZE_STAGE_LABEL` — lift that map from `EnhancedWalletDashboard.tsx` into a shared module so both surfaces use one copy.
- Verify with `walletService.getAuthorizationStatus()` before returning, so success is asserted from chain state, not from a transaction receipt alone.

**Return trip**
Use the `return` parameter, validated against an allow-list of hosts (`hub.thebigidia.com` plus the Hub's Lovable preview host) and the `idiahub://` scheme. Append `?authz=granted|denied|error&owner=<addr>&reason=<code>`. Navigate with `window.location.assign` so it works in the iOS shell, the Android WebView, and the browser alike.

**Relayer parameter**
The `relayer` value from the link is logged and compared against the relayer address returned by the `wallet-gas-drip` probe. On mismatch, refuse and return `error&reason=relayer_mismatch` rather than approving an unknown spender.

**Logging**
Bracketed `[HUB_AUTHZ_*]` begin/end logs at every stage (RECEIVED, AUTH_REQUIRED, WALLET_REQUIRED, MISMATCH, AUTHORIZING, VERIFIED, RETURN, FAILED) to match the project's existing logging style.

No database or edge-function changes are needed; `wallet-gas-drip` already supports the probe branch.
