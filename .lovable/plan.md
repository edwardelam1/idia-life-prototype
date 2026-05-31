
## Scope

Three legacy files were compared against the current implementations. Two regressions plus one quorum bug are in scope:

1. **`LifecycleTelemetry.tsx`** — currently rendered as a plain list of titles in unstyled buttons. The legacy file had the full mobile UI: phase-coded icon tile, badge + relative date row, click → polished `<Dialog>`. **All gone.** Restore it.
2. **Quorum stays "pending" forever** — both `ProposalCard` (in `ActiveProposalsList.tsx`) and the lifecycle `DetailDialog` route through `governanceService.getProposalQuorum` / `getCurrentQuorum`, which goes through a TTL cache + de-dupe + retry stack + `computeQuorumFromSupply` fallback chain. Under live RPC pressure this hybrid pipeline silently leaves the UI in "hydrating…" state. Switch to a direct RPC poll per card / dialog.
3. **`GovernanceScreen.tsx`** — current file is a superset of the legacy (adds `CommitteeWorkspaceBoundary`, `ApplicationReviewQueue`, `AuditFeed`). Nothing to restore. **No changes.**

Out of scope: edge functions, contracts, vote-write path, indexer, ACA, wallet nudge, chain-receive watcher.

## Files

- `src/components/governance/LifecycleTelemetry.tsx` — rewrite
- `src/components/governance/ActiveProposalsList.tsx` — swap one quorum call in `ProposalCard.useEffect`

---

## 1. Restore LifecycleTelemetry list UI

Replace the stripped list with the legacy presentation, but keep the current DetailDialog (it already does the right chain-side computation for `forVotes` / `againstVotes` / deadline math).

List item structure (per row, from legacy):

```
[ 📝 ⚡ ⏳ ✅ icon tile ]  Title (bold, truncate)
                          Phase label · created date
```

- White card, `rounded-2xl`, teal hairline border, subtle shadow, `hover:shadow-md`, `active:scale-[0.99]`.
- Phase icon/label/color from a `PHASE_META` map (draft/active/queued/executed) — same map already used by the current `DetailDialog`, just extract to module scope so both consume it.
- Limit fetch to `limit(8)` (legacy) — current `limit(50)` is overkill for a telemetry strip.
- Add the legacy Supabase realtime channel: `postgres_changes` on `dao_proposals` → re-fetch list. Tear down on unmount with `supabase.removeChannel`.
- Loading + empty states from legacy (`Loader2` spinner, "No Telemetry Detected").

Keep the current `DetailDialog` as-is — it already shows the quorum progress, for/against split, block number, and deadline countdown the user expects. The only DetailDialog change is item 2 below.

## 2. Direct-RPC quorum polling (kill the hybrid)

Both call sites currently do:

```ts
governanceService.getProposalQuorum(onChainId) // cached + retried + fallback chain
```

Replace with a local helper inside each component that talks straight to ethers, with no service-layer cache:

```ts
const directQuorum = async (onChainId?: string | null): Promise<bigint> => {
  const network = ACTIVE_DEPLOYMENT === "mainnet" ? "base" : "baseSepolia";
  const rpcUrl =
    (import.meta.env.VITE_ALCHEMY_RPC_URL as string | undefined) ||
    NETWORKS[network].rpcUrl;
  const provider = new ethers.JsonRpcProvider(rpcUrl, NETWORKS[network].chainId);
  const gov = new ethers.Contract(PROTOCOL.governor, GOVERNOR_ABI, provider);

  if (onChainId) {
    const snap = await gov.proposalSnapshot(onChainId);
    if (snap && Number(snap) > 0) return await gov.quorum(snap);
  }
  const block = await provider.getBlockNumber();
  return await gov.quorum(block - 1);
};
```

- No TTL cache, no in-flight dedupe, no `withRpcRetry` wrapper, no `computeQuorumFromSupply` fallback — pure on-chain reads, exactly as the user requested.
- Apply in **two places**:
  - `ProposalCard` `META_FETCH` effect — replace the `governanceService.getProposalQuorum / getCurrentQuorum` block. Result is `ethers.formatEther(bigint)` → `Number` into `setQuorumRequired`.
  - Lifecycle `DetailDialog` quorum block (BLOCK 1: TALLY & QUORUM) — replace both branches of `governanceService.getProposalQuorum` / `getCurrentQuorum`.
- Re-poll on a 15s interval while a card / dialog is mounted so a stuck "hydrating…" state self-heals on the next tick. Clear the interval in cleanup.
- Logs: keep the existing `[QUORUM_DEBUG]` prefixed lines so console diagnostics survive.

## 3. Verification

After edit:
- `LifecycleTelemetry` strip renders styled cards on `/index` Vote tab. Tapping one opens the polished dialog.
- ProposalCard quorum bar shows real numerator/denominator within ~2s of mount (not "quorum hydrating…").
- DetailDialog shows quorum + deadline countdown.
- Console shows `[QUORUM_DEBUG]` lines with non-zero values.
- No new TS errors, no unused imports.
