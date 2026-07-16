## Fix 1 — 401 on cron-driven DAO edge functions

Diagnosis confirmed from `cron.job`:

- `dao-treasury-ingest` (jobid 47) sends `apikey` but no `Authorization: Bearer` — the function requires `Authorization === "Bearer` IDIA_SERVICE_ROLE_KEY`"`.
- `dao-veto-tally-15min` (jobid 60) sends neither `apikey` nor `Authorization` and the function requires a valid user JWT with `sub` (cron has no user, so this can never succeed as written).
- `dao-hat-eligibility-daily` (59), `dao-proposal-tally-10min` (62), `dao-timelock-sweep-15min` (61), `mint-liability-receipt` (66), `pending-wallet-recovery` (67) also fire without any auth — same 401 latent risk.

Actions:

1. Reschedule every cron job above with a full `Authorization: Bearer <`IDIA_SERVICE_ROLE_KEY`>` header (plus keep `apikey`). Use one migration via `supabase--insert` (contains keys, cannot go in migration tool). Unschedule the broken ones first (`cron.unschedule('dao-treasury-ingest')`, `'dao-veto-tally-15min'`, `'dao-timelock-sweep-15min'`, `'dao-hat-eligibility-daily'`, `'dao-proposal-tally-10min'`, `'mint-liability-receipt'`, `'pending-wallet-recovery'`), then re-`cron.schedule` each with the service-role bearer.
2. Relax `dao-veto-tally/index.ts`: accept a `Bearer <`IDIA_SERVICE_ROLE_KEY`>` cron caller as an alternative to a user JWT (`if (token ===` IDIA_SERVICE_ROLE_KEY`) skip getClaims`), so scheduled sweeps of stale actions actually run. Keep the JWT path for user-triggered tallies.

## Fix 2 — Missing 1:1 IDIA royalty distribution on settlement

Root cause in `supabase/functions/idia-circular-settlement/index.ts`:

- Contributor payout loop calls `Escrow.proposeDistribution(recipient, 1 IDIA, reason)`. That only *creates a pending proposal* — it never transfers IDIA. Contributors see USDC but no IDIA because approval never runs.
- Amount is hardcoded to `parseUnits("1", 18)` (1 IDIA per contributor), not the 1:1 vs USDC payout the spec calls for.
- The new `IDIAEscrow.sol` (merge/lovable-sync-2) added `automatedDistribute(recipient, amount, reason)` which immediately `safeTransfer`s IDIA when called by an approved `automatedDistributor`.

Actions:

1. In `idia-circular-settlement/index.ts`:
  - Extend `ESCROW_ABI` with `automatedDistribute(address,uint256,string) returns (uint256)`.
  - Replace the `proposeDistribution` call (~line 588) with `automatedDistribute`.
  - Set `idiaAwardAmount = parseUnits(perContributorYield.toFixed(6), 18)` so the IDIA award mirrors each contributor's USDC yield 1:1.
  - Update the ledger `description` and add an `idia_award_amount` field so the wallet dashboard can label it.
2. In the same loop, insert a matching `fiat_ledger`/`settlement_queue` row of type `data_sale_idia_award` so `WalletDashboard.tsx` history shows the IDIA payout alongside the USDC one.
3. Backfill: after deploy, re-run `settlement-reconcile-ref` for recent `SYN-*` refs whose contributor payouts are missing IDIA hashes so contributors (including the user's son on `0x…b582`) receive their retroactive 1:1 IDIA award.

Prereq the user must confirm/handle on-chain (not code): the settlement relayer wallet (`SYNAPSE_RELAYER_PRIVATE_KEY` signer) must be registered on `IDIAEscrow` via `setAutomatedDistributor(<relayer>)` from the owner Safe, and the ecosystem escrow must hold enough IDIA to cover awards. If either is missing, `automatedDistribute` will revert `NotAuthorized` / `InsufficientBalance` and we'll see it immediately in the function logs.

## Verification

- After cron re-schedule: watch `dao-treasury-ingest` and `dao-veto-tally` logs for one full 15-minute cycle — no more 401, `[DAO_EXECUTION_END]` lines appear.
- After settlement fix: trigger one live IDIA Hub synapse credit consumption event, confirm `[END: Batch.Item] IDIA automatedDistribute successful` in `idia-circular-settlement` logs, contributor wallets show non-zero IDIA on-chain, and Wallet History renders both `data_sale_payout` (USDC) and `data_sale_idia_award` (IDIA) rows.