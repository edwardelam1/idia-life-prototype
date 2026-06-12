## Goal
Show the **Tap to Pay** button (instead of "Coming Soon") and the **Request USDC Payment** button on the wallet screen, without enabling any other release-gated features (Life / Shop / Pro tabs stay hidden until July 11, 2026).

## Root cause of current hiding
Both buttons are gated by `USDC_PAYMENTS_ENABLED` in `src/config/usdc.ts`, which is currently `= IS_TESTNET` (false on mainnet):
- `PaymentTrigger.tsx` checks `isPaymentEnabled = USDC_PAYMENTS_ENABLED` → renders "Coming Soon" badge + disabled card when false.
- `EnhancedWalletDashboard.tsx` wraps the **Request USDC Payment** button in `{USDC_PAYMENTS_ENABLED && (...)}`.

Note: `IDIA_PAY_RELEASE_DATE` / `isPayReady` is a separate gate used only by `MainApp.tsx` to hide whole tabs (Life, Shop, Pro). That gate is **not touched** — those tabs remain hidden.

## Change (one line)
**`src/config/usdc.ts`** — change:
```ts
export const USDC_PAYMENTS_ENABLED = IS_TESTNET;
```
to:
```ts
export const USDC_PAYMENTS_ENABLED = true;
```

That's it. This flips both gated wallet items on at once:
1. `PaymentTrigger` renders the active **Tap to Pay** button.
2. The **Request USDC Payment** button appears in the wallet overview.

## Explicitly NOT changed
- `src/config/release.ts` (`IDIA_PAY_RELEASE_DATE`) — untouched.
- `src/components/MainApp.tsx` tab gating — untouched. Life / Shop / Pro tabs stay hidden until 2026-07-11.
- `ACTIVE_DEPLOYMENT` / `IS_TESTNET` — untouched. App stays on mainnet.
- No backend, edge function, or contract changes.

## Note on the user's "3 buttons"
The wallet currently has **two** gated items (Tap to Pay + Request USDC Payment), not three. There is no Swap button in the codebase, and Add Funds (`AddFundsModal`) is already wired but currently has no trigger button on the EnhancedWalletDashboard overview. If you actually want a visible **Add Funds** quick-action button (and/or a Swap button) added to the wallet overview, say the word and I'll include that as a follow-up — but I won't add new UI as part of this plan since you asked only to unhide existing items.
