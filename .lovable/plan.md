# Proposer "Cancel Pending" — Visibility Fix

The Cancel button exists but is hidden by two issues. Fix both, frontend only.

## Root cause

`src/components/governance/ActiveProposalsList.tsx`

1. **Buried in detail dialog** (line 896) — the only render site for `<Button onClick={handleCancelPending}>` lives inside the proposal *detail* `<Dialog>` (opened at line 825). A proposer scanning the Active list never sees it unless they tap the card open.
2. **Hydration race on the gate** — the condition is `isProposer && chain.state === 0 && proposal.on_chain_id`. On first paint `chain` is the empty seed (`state: null`), so even after opening the dialog the button can be invisible for several seconds until the RPC poll completes. If the parent passes a non-null `initialChainState` with `state == null`, the button stays hidden indefinitely.

`isProposer` itself (line 272) is correctly computed from the DB-sourced `proposer_id` (UUID) against `currentUserId`, so the comparison is fine for DB-anchored rows (the only rows where cancel is allowed anyway, since `on_chain_id` is required).

## Fix

### A. Add a Cancel affordance on the card row (primary surface)

In the card body (around the existing per-card action area, near where `Vote For/Against` and the "Voting opens in…" notice live for Pending rows), render a small destructive button when the viewer is the proposer and the proposal is Pending:

```tsx
{isProposer && isPendingForViewer && proposal.on_chain_id && (
  <Button
    onClick={(e) => { e.stopPropagation(); handleCancelPending(); }}
    disabled={isCancelling}
    variant="ghost"
    size="sm"
    className="w-full h-9 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full"
  >
    {isCancelling
      ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Cancelling…</>
      : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Cancel Proposal (Pending)</>}
  </Button>
)}
```

`e.stopPropagation()` keeps the card's tap-to-open-detail from firing.

### B. Loosen the Pending gate to survive hydration

Introduce a single derived `isPendingForViewer` used by both the card button and the existing in-dialog button:

```ts
const isPendingForViewer =
  chain.state === 0 ||
  (chain.state == null && (
    proposal.indexed_state === 0 ||
    deriveDbState(proposal) === 0 ||
    /pending/i.test(proposal.status ?? "") ||
    /pending/i.test(proposal.lifecycle_phase ?? "")
  ));
```

Replace `chain.state === 0` in the existing dialog gate (line 896) with `isPendingForViewer`. The relay edge function already enforces "must be on-chain state 0" server-side, so loosening the client gate is safe — the worst case is a click that returns the friendly "Voting has already opened" toast that's already wired in `handleCancelPending`.

### C. Keep the in-dialog Cancel button

Unchanged, just driven by the same `isPendingForViewer` so it stops vanishing mid-hydration.

## Out of scope

- `relay-governance-action` edge function — already authorizes proposer parity and refuses non-Pending state.
- Vote-blast overlay, dialog copy, Tophat override.
- No DB / migration changes.

## Verification

- As proposer, with a freshly-created Pending proposal: the card shows "Cancel Proposal (Pending)" without opening the detail dialog.
- Tapping the card still opens detail; cancel button there is also visible immediately on open (no flicker waiting for RPC).
- Once chain.state flips to 1 (Active), both buttons disappear.
- Non-proposers never see the button on either surface.
