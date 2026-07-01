# L3 Tophat = Universal Committee Override

## Problem

The other Protocol Steward (L3) shows up in every committee roster (rendered via `CommitteeRosterModal`, which already treats tophat holders as honorary members) but:

1. His **Hats Wardrobe** shows only Tophat lit — the four committee hats are grayed/severed.
2. His **Committee Workspace** sidebar is empty or auto-selects `committee_id='tophat'`, returning no proposals.
3. On any **MotionThread** he cannot Endorse or Object — the buttons are gated on `hatSet.has(proposal.committee_id)`, and tophat isn't checked.

Root cause: `dao_hats` only holds a `tophat` row for him. The rest of the UI checks for literal per-committee hat rows and does not treat tophat as a universal override — even though `CommitteeRosterModal` already does exactly that (`CommitteeRosterModal.tsx:57–72`).

## Fix — Frontend-only, no DB writes, no migrations

Add a single override rule everywhere committee membership is evaluated on the client: **`tophat ⇒ member of every committee`**. This matches the existing roster-modal behavior and the intent of L3 clearance in `governanceGate.ts`, and it fixes both existing and future L3 users automatically without backfilling `dao_hats`.

### 1. `src/components/governance/HatsWardrobe.tsx`
When the user holds an `active` tophat, render the four committee hats (`security_council`, `product_xr`, `legal_defense`, `sociorelational`) as `active` too — synthesize virtual wearer entries so they light up with the standard active styling. Skip the Attest CTA on synthesized entries (they're not real ledger rows). Real committee hat rows still take precedence for status and attestation age.

### 2. `src/components/governance/CommitteeWorkspace.tsx`
- Compute `committeeHats = tophat ? ALL_COMMITTEES : activeHats.filter(h => h.hat_type !== 'tophat' && h.hat_type !== 'oversight_chair')`.
- Render the sidebar from `committeeHats` (so tophat holders see all four committees, not a stray "Tophat" entry that resolves to no proposals).
- Change the "Restricted Access" empty guard to `committeeHats.length === 0` so tophat-only users pass through.
- Auto-select the first entry from `committeeHats`.

### 3. `src/components/governance/MotionThread.tsx` (line 108)
Change:
```ts
setHasHat(proposal.committee_id ? hatSet.has(proposal.committee_id) : false);
```
to:
```ts
setHasHat(
  hatSet.has('tophat') ||
  (proposal.committee_id ? hatSet.has(proposal.committee_id) : false)
);
```
This enables Endorse / Object for any L3 tophat holder on any committee's motion, matching the existing L3-can-do-anything model in `governanceGate.ts`.

## What this does NOT change

- No changes to `ascension-approve`, `oversight-chair-toggle`, or `CommitteesList.tsx` tophat self-service flow.
- No `dao_hats` inserts, no migrations, no policy changes — the override lives entirely in the presentation layer, same as `CommitteeRosterModal`'s existing honorary-L3 display.
- L0/L1/L2 users are unaffected (they don't hold tophat).
- Attestation lifecycle (`dao-hat-eligibility`) still tracks the real tophat row; synthesized committee entries never need attesting.

## Effect

The other L3 user immediately sees all four committee hats lit in the Wardrobe, sees all four committees in the Workspace sidebar with their real proposals, and can Endorse/Object on any motion — with no data changes required.
