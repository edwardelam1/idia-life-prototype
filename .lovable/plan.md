# Governance Hardening — Shawn's 3-Fix Integration (v2, gasless relayer)

## Audit results

| # | Fix | Current state |
|---|------|----------------|
| 1 | Sequential RPC w/ delay | `useWalletBalance.ts` L187-193 uses `Promise.all` for 5 chain reads. `ActiveProposalsList.tsx` L371-377 fires Supabase + on-chain in parallel. ❌ |
| 2 | `isSelfDelegated` activation | `governanceService.getDelegationInfo()` exists; nothing in UI surfaces it. ❌ |
| 3 | Dynamic quorum in list | `getCurrentQuorum`/`getProposalQuorum` only used by `LifecycleTelemetry` detail dialog. ❌ |

## Changes

### 1. Sequential RPC hydration (`src/hooks/useWalletBalance.ts`)
- Add `delay(ms)` helper.
- Replace L187-193 `Promise.all` with 5 sequential `await` calls, each followed by `await delay(400)`. Keep per-call `.catch()` fallbacks.

### 2. Sequential proposal load
- `ActiveProposalsList.tsx` L371-377: load Supabase first, `await delay(400)`, then `getRecentProposals`.
- `governanceService.getRecentProposals` per-proposal loop (L280-): add `await delay(250)` between iterations.

### 3. Self-Delegation Activation flow — **gasless via Edge Function**

**New edge function `supabase/functions/relay-delegation/index.ts`**
- Standard CORS + `getClaims()` auth (see project edge-function standards).
- Reads `SUPABASE_SERVICE_ROLE_KEY`, `RELAYER_PRIVATE_KEY` (existing relayer key used by `relay-usdc-transfer`/`relay-governance-action`), `ALCHEMY_RPC_URL`.
- Input: `{ delegatee?: string }` (defaults to caller's `wallet_address` for self-delegate).
- Validates caller has a `wallet_address` in `profiles`.
- Generates ACA hash (`recordACA` shared util) tagged `GOVERNANCE_DELEGATE`.
- Uses ethers + relayer signer to call `IDIA.delegate(delegatee)` on behalf of user's wallet — actually, since ERC20Votes `delegate()` self-records `msg.sender`, the relayer cannot delegate FOR the user. **Use `delegateBySig`**: the client signs an EIP-712 typed message offline, posts signature to the function, function submits via relayer. Function expects `{ signature: { v,r,s }, nonce, expiry, delegatee }`.
- Returns `{ hash, acaHash }`.
- Logs ACA via shared `recordACA.ts`.

**New service method `governanceService.signAndRelaySelfDelegation()`**
- Gets connected signer's address.
- Reads `nonces(address)` from IDIA token.
- Builds EIP-712 Delegation typed data (standard OZ ERC20Votes domain).
- `signer.signTypedData(domain, types, value)` → split into `{v,r,s}`.
- `supabase.functions.invoke('relay-delegation', { body: { delegatee, nonce, expiry, signature } })`.

**New component `src/components/governance/ActivateVotingPowerCard.tsx`**
- Renders when `idia_token_balance > 0 && !isSelfDelegated`.
- Glassmorphism, teal/orange palette.
- CTA "Activate Voting Power" → calls `governanceService.signAndRelaySelfDelegation()` → toast → `refreshBalance()`.
- Loading + error states with stage logger.

**`GovernanceScreen.tsx`**
- After balance loads, call `getDelegationInfo(walletAddress)` sequentially; store `isSelfDelegated` and pass to `ActiveProposalsList`.

**`ActiveProposalsList.tsx`**
- New prop `isSelfDelegated`. When false + balance>0, render `<ActivateVotingPowerCard/>` above proposal list.

### 4. Dynamic Quorum in `ProposalCard`
- In existing `useEffect`, after votes query add `await delay(300)` then call `getProposalQuorum(on_chain_id)` (fallback `getCurrentQuorum()`).
- Sum `vote_weight` from `dao_votes` rows for `totalWeight`.
- Render `<Progress>` bar: `Quorum {totalWeight}/{quorumRequired} ({pct}%)`. Teal <100%, emerald ≥100%.

### 5. Secrets needed
- Verify/add: `RELAYER_PRIVATE_KEY` (likely already present for other relayers), `ALCHEMY_RPC_URL`. If missing, pause and request via secrets tool.

### 6. Verification
- Console clean of 429s during Vote page load.
- IDIA-holding, non-delegated wallet sees Activate card → click → edge function deploys → tx hash returned → after refresh, votes>0, card gone.
- Quorum bar appears on active proposals.

## Files touched

```
src/hooks/useWalletBalance.ts                              (modify)
src/services/governanceService.ts                          (modify — throttle loop, add signAndRelaySelfDelegation)
src/components/governance/GovernanceScreen.tsx             (modify)
src/components/governance/ActiveProposalsList.tsx          (modify)
src/components/governance/ActivateVotingPowerCard.tsx      (new)
supabase/functions/relay-delegation/index.ts               (new)
```

No DB migrations.
