## Problem

On the Governance screen, the "Manual" button in `HatsWardrobe.tsx` is currently an `<a download>` that triggers a PDF download (or on some browsers, a full-page navigation away from Gov with no way back). Users want it to pop open an in-app viewer with a Close button — the same UX as the Terms of Service / Welcome Manual gate.

## Plan

1. **Create `src/components/governance/ManualViewerModal.tsx`**
   - Full-screen fixed overlay (mirrors `WelcomeManualGate` styling: `fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl`, rounded card, safe-area padding).
   - Renders the same 11 `/legal/duna-manual-pages/page-XX.jpg` images and "Open in new tab" fallback.
   - Header: "IDIA Data DUNA — Welcome Manual" with `ScrollText` icon and a top-right Close (X) button.
   - Footer: "Download PDF" link + secondary "Close" button.
   - No ACA hashing, no acknowledgement — this is a read-only reference viewer.

2. **Update `src/components/governance/HatsWardrobe.tsx`**
   - Replace the `<a href download>` Manual chip with a `<button>` that flips local `isManualOpen` state.
   - Render `<ManualViewerModal open={isManualOpen} onClose={...} />` at the bottom of the component.
   - Keep the existing chip styling.

## Out of scope
- `WelcomeManualGate` (first-visit acknowledgement) stays as-is.
- No changes to routing, no new page.

## Files
- new: `src/components/governance/ManualViewerModal.tsx`
- edit: `src/components/governance/HatsWardrobe.tsx`
