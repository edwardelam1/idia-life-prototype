# Fix 1 — IDIA Balance Precision Mismatch

**Root cause:** `WalletDashboard.tsx` and `EnhancedWalletDashboard.tsx` render `idia_token_balance.toFixed(2)`, which rounds `0.998` to `"1.00"`. `GovernanceScreen.tsx` uses `toLocaleString(undefined, { maximumFractionDigits: 4 })`, which correctly shows `"0.998"`.

**Change (presentation-only):**
- `src/components/WalletDashboard.tsx` (line 190) — replace `balance.idia_token_balance.toFixed(2)` with `balance.idia_token_balance.toLocaleString(undefined, { maximumFractionDigits: 4 })`.
- `src/components/enhanced/EnhancedWalletDashboard.tsx` (lines 456 and 520) — same replacement, preserving the existing `?? 0` / fallback guards.

No data layer or hook changes.

---

# Fix 2 — Quorum Progress Shows `0/0`

**Root cause:** In `LifecycleTelemetry.tsx`'s `DetailDialog`, when a proposal has no `on_chain_id` (the common case right now), it falls back to `governanceService.getCurrentQuorum()`. That method calls `Governor.quorum(blockNumber - 1)`, which on the live Governor returns `0` because the past-total-supply checkpoint at that block is 0 (the IDIA token's voting checkpoint history is sparse). The UI then shows `0 / 0`.

**Change:** Compute the live quorum deterministically from `quorumNumerator()` × current `totalSupply()` ÷ `QUORUM_DENOMINATOR`, which is what the Governor uses internally and will always reflect the real threshold.

### `src/services/governanceService.ts`
Replace the body of `getCurrentQuorum()` with:

1. Call `quorum(blockNumber - 1)` first (preserves existing behavior when checkpoints exist).
2. If the result is `0`, compute fallback:
   - `numerator = await callRaw("quorumNumerator", [])` (no-arg overload)
   - `denominator = await callRaw("QUORUM_DENOMINATOR", [])` (defaults to `100` if missing)
   - `totalSupply = await IDIA_TOKEN.totalSupply()` via a read-only ERC20 contract on `PROTOCOL.idiaToken`
   - Return `ethers.formatEther((totalSupply * numerator) / denominator)`
3. Wrap each step in try/catch with `[QUORUM_FALLBACK]` log markers; final fallback is `'0'`.

Also apply the same numerator × supply ÷ denominator fallback inside `getProposalQuorum()` when `gov.quorum(snapshotBlock)` returns `0`, so detail dialogs for proposals that *do* have an `on_chain_id` also recover gracefully.

### `src/components/governance/LifecycleTelemetry.tsx`
No structural change. `liveQuorum` now receives a non-zero value, and the existing display (`{totalVotes} / {activeQuorum}`) and `pct` math will render correctly. Add one log line `[QUORUM_DEBUG] Final activeQuorum applied: ${activeQuorum}` for confirmation.

---

## Out of Scope
- No DB migration.
- No changes to vote-tally weighting, `propose`, or relayer paths.
- No new `governanceService` methods beyond editing the two read functions above.

## Files Touched
- `src/components/WalletDashboard.tsx`
- `src/components/enhanced/EnhancedWalletDashboard.tsx`
- `src/services/governanceService.ts`
- `src/components/governance/LifecycleTelemetry.tsx` (one log line)
