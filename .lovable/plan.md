## Diagnosis

The console shows: `JsonRpcProvider failed to detect network and cannot start up; retry in 1s` looping every second. Both USDC and IDIA on the wallet/Vote pages are read from the same `ethers.JsonRpcProvider(VITE_ALCHEMY_RPC_URL, 8453)` in `useWalletBalance.ts` and `GovernanceScreen.tsx`, so when the provider fails, both balances stay at 0.

Root cause is in `.env`:

```
VITE_ALCHEMY_RPC_URL="https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N"npx supabase secrets set RPC_URL_BASE='https://mainnet.base.org'xz
```

A stray shell command was concatenated to the value, so Vite reads a malformed URL. `ethers` can't reach Base, both reads fail, and the cached zeros render.

Both USDC and IDIA already share the same Alchemy-on-Base provider — there is no separate "Alchemy webhook" backend. Once the RPC URL is repaired, USDC and IDIA hydrate together on the same 15-second poll.

## Plan

1. **Repair `.env`**
   - Replace the corrupted line 8 with a clean assignment:
     ```
     VITE_ALCHEMY_RPC_URL="https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N"
     ```
   - Leave the existing Supabase variables untouched.

2. **Harden RPC client construction** (`src/hooks/useWalletBalance.ts` and `src/components/GovernanceScreen.tsx`)
   - Validate `VITE_ALCHEMY_RPC_URL` is a well-formed `https://` URL before passing to `ethers.JsonRpcProvider`. If not, log a clear `[RPC_CONFIG]` error and fall back to `https://mainnet.base.org`.
   - Pass an explicit `Network.from(8453)` so ethers does not perform a network-detection round-trip (avoids the "failed to detect network" retry loop on flaky endpoints).
   - Add a single `staticNetwork: true` provider option so each call reuses the same chain metadata.

3. **Unify USDC + IDIA hydration**
   - Keep the existing parallel `Promise.all([usdc.balanceOf, idia.balanceOf])` in `useWalletBalance` so one network round trip refreshes both.
   - Update `GovernanceScreen` to consume `idia_token_balance` from `useWalletBalance` instead of doing its own duplicate `balanceOf` read, guaranteeing the Vote page IDIA value matches the wallet page exactly.

4. **Validate**
   - Reload the preview, watch console for `[FETCH_BALANCE_LOG] SUCCESS: USDC=$… · IDIA=…`, and confirm the JsonRpcProvider retry-loop log disappears.
   - Confirm the wallet page USDC card and the Vote page IDIA card both show the live on-chain balance for the connected sovereign wallet.

## Out of scope

- No new edge function or webhook (current architecture polls Alchemy directly from the client; that matches the user's intent of "USDC and IDIA both via Alchemy on Base").
- No database/RLS changes.