## Plan

1. **Fix the visible proposal-card quorum source**
   - Update `readChainState` in `ActiveProposalsList.tsx`, because it bypasses `governanceService.ts` and is still calling `gov.quorum(...)` directly.
   - Replace direct quorum reads with delegated-supply math using `IDIA_TOKEN_ABI.getPastTotalSupply(snapshotBlock/currentBlock - 1) * quorumNumerator / QUORUM_DENOMINATOR`.
   - If delegated supply is `0` or the snapshot lookup is unavailable, keep quorum at `0` so the existing UI shows “quorum hydrating…” instead of `400,000,000`.

2. **Fix the lifecycle/detail modal quorum source**
   - Update `LifecycleTelemetry.tsx`’s `directQuorum` helper, which also bypasses `governanceService.ts` and can display the same inflated value.
   - Use the same delegated-supply calculation and zero-supply guard there.

3. **Add ABI support in the shared token ABI**
   - Add `function getPastTotalSupply(uint256 timepoint) view returns (uint256)` to `IDIA_TOKEN_ABI` in `contracts.ts` so UI helpers don’t need inconsistent inline ABIs.

4. **Keep the previous service fix intact**
   - Do not reintroduce `totalSupply()` fallback for quorum.
   - Keep “syncing/hydrating” behavior for zero or unavailable delegated supply.

5. **Verify**
   - Confirm no remaining UI quorum paths call `gov.quorum(...)` directly without a delegated-supply guard.
   - Check dev-server output for compile/runtime errors after implementation.