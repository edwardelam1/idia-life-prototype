# Governance Refinements — Plan

## 1. Withdraw proposal (proposer-only, no votes cast)

- `ActiveProposalsList.tsx`: when the row's `proposer_id === currentUserId` AND the live vote count for that proposal is `0`, render a small "Withdraw" ghost button next to the VOTE button.
- Handler calls `supabase.from('dao_proposals').delete().eq('id', proposal.id)` (RLS already restricts to proposer). Re-check vote count immediately before delete to avoid races; if any vote exists, toast "Cannot withdraw — votes already cast" and refresh.
- Stage-logged with `[PROPOSAL_WITHDRAW] START / END:OK / END:FAIL`.
- DB: add RLS policy allowing proposer to DELETE their own `dao_proposals` only when no rows exist in `dao_votes` for that proposal (enforced via `USING` subquery). Migration required.

## 2. Remove `IDIATokenBeta.sol`

- Delete `contracts/contracts/IDIATokenBeta.sol`.
- Grep `IDIATokenBeta` across `contracts/scripts/` and `contracts/hardhat.config.ts` and remove any references / deploy scripts that target it. Do NOT touch `src/config/contracts.ts` mainnet addresses.

## 3. Lifecycle Telemetry tap → detail popup

- `LifecycleTelemetry.tsx`: wrap each row in a button that opens a `Dialog`.
- Dialog content for the tapped proposal:
  - Title, full description, category, lifecycle phase badge.
  - **Voting meter**: horizontal progress bar showing `currentForVotes / quorum_threshold` with numeric `X / Y votes` label and percent. Tally fetched via `supabase.from('dao_votes').select('vote_weight').eq('proposal_id', id).eq('vote_type','for')` summed.
  - **Time remaining**: countdown to `end_date` ("Auto-fails in 3d 4h"). If `end_date` is null, show "No deadline set". If past and not passed → "Failed — quorum not met".
- Re-uses existing `Dialog` primitive; matches glossy theme.

## 4. Disable + minimize voted-on proposals

- `ActiveProposalsList.tsx` `ProposalCard`: on mount, also fetch whether the current user has voted (`dao_votes` row with matching `user_id` + `proposal_id`). 
- If voted: render a compact, collapsed card (one-line title + "✓ Vote cast — weight N" pill, muted styling), no slider, no VOTE button. Tap expands to read-only details.
- After a successful vote, transition the card into the minimized state without a full refetch.

## 5. Remove quadratic weighting — strict 1:1

- `ActiveProposalsList.tsx`:
  - Delete `calculateVoteCost` and the `Slider`. Replace with two buttons: **VOTE FOR** and **VOTE AGAINST**.
  - Each click submits `vote_weight: 1`, `credits_spent: 1`, `vote_type: 'for' | 'against'`.
  - Remove "Quadratic Weight", "Cost: X IDIA", and slider UI; replace section label with "Cast Sovereign Vote · 1 IDIA".
  - Insufficient-IDIA check becomes `balance < 1`.
- `GovernanceScreen.tsx`: change section header from "Active Proposals · Quadratic" to "Active Proposals · 1:1 Vote".
- `CreateDaoProposalModal.tsx`: change inserted `vote_type` and `voting_modality` from `'quadratic'` to `'simple'`; update log strings ("quadratic ledger" → "vote ledger").
- DB: no schema change needed (text columns accept new values). No migration required for this item.

## Out of scope
- Edge functions (`supabase/functions/**`) — Shawn-owned.
- Mainnet contract addresses / ABIs.
- `src/integrations/supabase/types.ts`.

## Technical notes
- One migration: DELETE policy on `dao_proposals` guarded by `NOT EXISTS (SELECT 1 FROM dao_votes WHERE proposal_id = dao_proposals.id)` AND `proposer_id = auth.uid()`.
- All new async paths wrapped with the existing `stageLogger` `[START]` / `[END:OK|FAIL]` convention.
