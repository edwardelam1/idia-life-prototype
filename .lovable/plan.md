## Issue 1 — Proposal progress bar is missing

**Root cause.** `ProposalCard` in `ActiveProposalsList.tsx` only renders the Quorum Progress card when `quorumRequired > 0`. The on-chain quorum fetch (`governanceService.getProposalQuorum` / `getCurrentQuorum`) is being throttled by the Base RPC (console shows `code: -32016 "over rate limit"`), so `quorumRequired` stays at 0 and the bar disappears entirely. Every mounted proposal card also fires its own quorum RPC, multiplying the load.

**Fix.**
- Always render the Quorum Progress card.
  - While `quorumRequired === 0`: show the bar in a muted "hydrating…" state with current `totalWeight` / `voteCount` and an indeterminate fill.
  - Once `quorumRequired > 0`: behave exactly as today (percentage + emerald fill at/above quorum).
- Make the per-card quorum fetch resilient instead of silently failing.

## Issue 2 — RPC rate-limit makes quorum unreliable

**Root cause.** Each `ProposalCard` independently calls the Base RPC for quorum on mount with no shared cache and no retry, so a handful of proposals plus the wallet-balance hooks blow past the public node's rate limit. Result: `over rate limit` → `quorumRequired = 0` → bar hidden.

**Fix (in `src/services/governanceService.ts`).**
- Add a **module-level quorum cache** (TTL ~60s, keyed by `proposalId` or `"current"`). Quorum is snapshot-bound and effectively constant within a vote window, so caching is safe and keeps the displayed count accurate.
- Add an **in-flight de-dup map** so N proposal cards mounting at once trigger exactly one RPC, not N.
- Add a small **`withRpcRetry` helper** with exponential backoff (3 tries, ~600ms → ~1.2s → ~2.4s + jitter) that detects `-32016` / `429` / `rate limit` messages and retries. Non-rate-limit errors throw immediately.
- Wrap the raw `quorum()` and `proposalSnapshot()` calls in `getProposalQuorum` and `getCurrentQuorum` with `withRpcRetry`, falling back to `computeQuorumFromSupply` only when the chain genuinely returns 0 — never when we were just throttled.
- Keep `computeQuorumFromSupply` as the deterministic last-resort fallback (unchanged).

Net effect: users see the **exact on-chain quorum** the Governor will enforce, even under RPC pressure, and the UI never silently swallows the number.

## Issue 3 — Committee roster shows the wrong ascension level

**Root cause.** `CommitteeRosterModal.tsx` derives each member's level using only two hats:
- `oversight_chair` → L2
- otherwise active → L1

It never checks `tophat`, so an L3 Protocol Steward who also holds the committee hat renders as L1 (or L2 if they happen to hold oversight_chair). This contradicts the single source of truth in `utils/governanceGate.ts → getAscensionLevel`, which already handles tophat → L3.

**Fix.**
- In the roster loader, also fetch active `tophat` holders for the same `user_id` set (one extra query, mirroring the existing `oversight_chair` query).
- For each member, build a `Set<string>` of their active hats (`committee.id` + `oversight_chair` if present + `tophat` if present) and run it through `getAscensionLevel`. The roster now always agrees with `HatsWardrobe`, `CommitteesList`, and `ActiveProposalsList`.
- Promote/demote buttons stay gated on `level === 1` / `=== 2`; L3 stewards correctly show no toggle (stewards aren't managed via this surface).
- Pending-veto members keep their existing `L1 · pending` badge.

## Files touched

- `src/services/governanceService.ts` — quorum cache, in-flight de-dup, `withRpcRetry` helper applied to `getCurrentQuorum` and `getProposalQuorum`.
- `src/components/governance/ActiveProposalsList.tsx` — progress card always renders; muted/indeterminate state while quorum hydrates.
- `src/components/governance/CommitteeRosterModal.tsx` — include `tophat` in per-member level via `getAscensionLevel`.

## Out of scope

- The separate USDC `over rate limit` errors in `useWalletBalance` (different code path). Can be addressed in a follow-up if you want the same retry/cache treatment applied there.
- Any backend / edge function changes.
