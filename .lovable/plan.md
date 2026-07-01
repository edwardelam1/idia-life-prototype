## 1. Motion escalation → spawn a real on-chain proposal

**`src/components/governance/MotionThread.tsx`** — replace the current server-only `escalate()` with a two-step client + server flow:

1. Client:
   - Require `walletService.getConnectedSigner()`; toast + abort if missing (mirrors `CreateDaoProposalModal`).
   - Build a salted description: `# ${title}\n\n${motion_description or motion body}\n\n---\n*System Ref: ${proposal.id}*` so the on-chain descriptionHash is unique.
   - Call `governanceService.propose(saltedDescription)` → get `{ hash, proposalId }`. Await receipt for `on_chain_block`.
2. Server:
   - Extend `supabase/functions/gov-escalate-motion/index.ts` to accept `on_chain_id`, `tx_hash`, `on_chain_block` in the body, validate they are strings, and, after the existing L2+ / quorum checks, update the row to:
     ```
     lifecycle_phase = 'active'
     status          = 'active'
     on_chain_id     = <arg>
     tx_hash         = <arg>
     on_chain_block  = <arg>
     escalated_at    = now()
     escalated_by    = caller
     end_date        = now() + 7d  -- kept for legacy telemetry
     ```
     (drops the `'active_vote'` phase entirely — that value is not in the telemetry whitelist and is what caused the previous zombie-motion state.)
   - Keep the caller-hats gate, the endorsement-quorum gate, and the ACA mirror.
3. On success the motion now appears in `ActiveProposalsList` (it filters on `on_chain_id`) and in `LifecycleTelemetry` with phase `active` → `Live Vote`. That's the correct label, because it's now a real live governor vote.

Also: extend `MotionThread`'s hydrate query to pull `title` and `description` from `dao_proposals` so the salted description carries the full body (currently the prop only surfaces `title`).

## 2. Relabel "Live Vote" → "Passing / Failing" once quorum is reached

**`src/components/governance/ActiveProposalsList.tsx`** — inside `ProposalCard`, where the badge is rendered (around line 1228 / `isActive` branch and `statusIcon` at 1233):

- Compute `quorumReached = chain.quorum > 0 && (chain.forVotes + chain.abstainVotes) >= chain.quorum` (OZ semantics: For + Abstain count toward quorum; against does not).
- Compute `majorityFor = chain.forVotes > chain.againstVotes`.
- When `isActive && quorumReached`: replace the visible label from `chainName` (`"Active"`) / "Live Vote" wording with:
  - `Passing · Voting Open` (teal/emerald tone) when `majorityFor`
  - `Failing · Voting Open` (rose tone) when `!majorityFor`
- `statusIcon` becomes `✅` / `⚠` accordingly. Governor state (1) is untouched — this is purely a display swap.

**`src/components/governance/LifecycleTelemetry.tsx`** — mirror the same derivation for the telemetry row so the tile badge doesn't disagree with the card. In the per-row mapping (around line 327) after we know `st === 1`, do a lightweight tally read (`dao_votes` sum, already used by `DetailDialog`) OR pull `forVotes/againstVotes/quorum` off `readChainState` (already returned) and swap `status` to `"Passing"` / `"Failing"` when quorum met. Keep `lifecycle_phase: 'active'` — the badge label change is done in a new `PHASE_META`-adjacent helper `resolveActiveLabel(row, chainState)` used at render time so the map stays typed.

## 3. Restrict Submit Proposal button to L3 (tophat) only

**`src/utils/governanceGate.ts`** — change:
```
SUBMIT_PROPOSAL: 1,
```
to:
```
SUBMIT_PROPOSAL: 3,
```
That single edit propagates because `GovernanceScreen.tsx` already gates the button on `ascensionLevel >= ACTION_REQUIRED_LEVEL.SUBMIT_PROPOSAL`. L1/L2 users lose the button entirely; their only path to a DAO-wide vote is filing a motion in the committee workspace and getting it escalated (per §1).

No change needed to `CreateDaoProposalModal` itself — it's already only reachable through that gated button in the governance screen.

## Acceptance criteria

- Escalating a motion from `MotionThread` prompts a wallet signature, anchors on Governor, writes `on_chain_id` + `tx_hash` back to the motion row, and the row then appears in Active Proposals as a normal live vote.
- Once `forVotes + abstain ≥ quorum`, cards in Active Proposals and tiles in Lifecycle Telemetry display "Passing · Voting Open" (or "Failing · Voting Open") instead of "Live Vote", while the on-chain state remains Active.
- Only L3 (tophat) users see the `+ Submit Proposal` button. L1/L2 see the section header without the button.

## Out of scope

- Backfilling the existing stuck `active_vote` row (`Test Motion 1`) — that can be handled in a one-off data patch afterward if you want it cleaned up.
- Deadline-passed transitions (Governor already flips state 1 → 3/4 at deadline; existing code handles that path).
