## Goal
Add small circular **(?)** buttons next to every meaningful element/action on the Governance page. Tapping the (?) opens a short plain-English tooltip explaining what the element is or what the button does. Mobile-friendly (tap, not hover).

## New component
`src/components/governance/InfoTip.tsx`
- Renders a tiny circular button (`w-4 h-4`, muted border, `?` glyph, `aria-label`).
- Uses shadcn `Popover` (tap-to-open, tap-outside-to-close) — works reliably on iOS Safari/WKWebView unlike hover-based `Tooltip`.
- Props: `label: string` (used for aria), `children: ReactNode` (tooltip body), optional `side`.
- Styled to match glossy light/dark theme (`bg-popover text-popover-foreground`, rounded-2xl, max-w-[240px], text-[11px] leading-relaxed).

## Where the (?) buttons get placed
Only presentation — no logic changes. Inserted inline next to headings/labels/CTAs in these files:

1. `src/components/GovernanceScreen.tsx` — section headers (Hats Wardrobe, Active Motions, Active Proposals, Successful, Locked, Archive, Execution Tracker, Treasury Flows, MSA, Audit Trail, Application Review Queue, Pending Actions).
2. `src/components/governance/HatsWardrobe.tsx` — one (?) next to the "Hats Wardrobe · Role Authority" heading explaining Hats/attestation/gray/severed; keep existing `title=` hover as-is.
3. `src/components/governance/ActiveProposalsList.tsx` — heading (?) explaining live vote / quorum / states; (?) next to the quorum readout.
4. `src/components/governance/ArchiveProposalsList.tsx`, `SuccessfulProposalsList.tsx`, `LockedProposalsList.tsx`, `LifecycleTelemetry.tsx`, `ExecutionTracker.tsx`, `TreasuryFlows.tsx`, `MSAComplianceCard.tsx`, `AuditFeed.tsx`, `CommitteesList.tsx`, `ApplicationReviewQueue.tsx`, `PendingActionsCarousel.tsx` — one (?) per section header.
5. `src/components/governance/CreateDaoProposalModal.tsx` — (?) beside the 50-word minimum indicator and AI validation gate.
6. `src/components/governance/MotionThread.tsx` — (?) beside Endorse / Escalate / Veto buttons.
7. `src/components/governance/ActivateVotingPowerCard.tsx` — (?) beside "Activate Voting Power" explaining self-delegation & gasless relay.
8. `src/components/governance/ReattestDialog.tsx` and `RecallPetitionDialog.tsx` — (?) beside primary action.

## Copy (short, plain-English)
Kept ≤ 220 chars each, e.g.:
- Hats Wardrobe: "Your on-chain roles. Active hats grant authority; gray hats need re-attestation within 30 days or they gray out; severed = you don't hold this role."
- Live Vote: "Voting is open on-chain. Quorum is pulled live from the governor contract, so the target updates if governance parameters change."
- Quorum: "Minimum voting power required for a proposal to be valid. Read live from the V3 governor, not hardcoded."
- Motion Escalate: "Once a motion clears 3 endorsements, it can be escalated to an on-chain proposal."
- Veto: "Security Council action. Requires Face ID / Secure Enclave attestation on your device."
- Submit Proposal (L3 only): "Only Tophat holders can submit proposals directly. L1/L2 must escalate through motions."
- Treasury Flows / MSA / Audit: brief one-liner each.

Full copy list will live inside each usage site (no central strings file needed — keeps diffs local).

## Interaction & a11y
- Button: `type="button"`, `aria-label="What is {label}?"`, focus-visible ring.
- Popover opens on tap/click and on Enter/Space; closes on outside tap or Esc.
- No hover-only behavior (mobile-first).

## Out of scope
No changes to governance logic, edge functions, DB, or existing hover `title=` attributes.
