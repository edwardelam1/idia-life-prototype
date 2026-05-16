# Dark Mode Pass — Governance Surface

The Glossy Light Theme stays the default. This pass only adds `dark:` overrides where hardcoded white / teal-50 / slate-700 / slate-800 / orange-50 / amber-50 backgrounds and text break in dark mode. No layout, no logic, no light-mode regressions.

## Scope

1. **`src/components/GovernanceScreen.tsx`** — outer wrapper `bg-white min-h-screen` → keep light, add `dark:bg-background`. Section header text uses `text-muted-foreground` already (theme-safe), leave alone.

2. **`src/components/governance/SegmentedJurisdiction.tsx`** — pill bar uses `bg-teal-50/60`, `border-teal-100/70`, inactive text `text-teal-700/60`. Add `dark:bg-teal-950/40 dark:border-teal-900/60`, inactive `dark:text-teal-200/60 dark:hover:text-teal-100 dark:hover:bg-teal-900/40`, sublabel `dark:text-teal-300/40`. Active pill is already teal/white — keep.

3. **`src/components/governance/HatsWardrobe.tsx`** — manual link chip, tile backgrounds (`bg-white`, `bg-amber-50/50`, `bg-slate-50`), and `text-slate-400` / `text-teal-800`. Add `dark:bg-card dark:border-teal-900/60`, grayed → `dark:bg-amber-950/30 dark:border-amber-900/50`, severed → `dark:bg-muted/40 dark:border-border`, label colors `dark:text-teal-100 / dark:text-amber-300 / dark:text-muted-foreground`.

4. **`src/components/governance/PendingActionsCarousel.tsx`** — card `bg-white border-orange-100` and inner `bg-orange-50/80`, `text-slate-800`, `text-slate-400/700` need `dark:bg-card`, `dark:border-orange-900/40`, `dark:bg-orange-950/30 dark:border-orange-900/40`, `dark:text-foreground`, `dark:text-muted-foreground`. Empty state `bg-orange-50/50` → add `dark:bg-orange-950/20 dark:border-orange-900/40`.

5. **`src/components/governance/ActiveProposalsList.tsx`** — `ProposalCard` uses `border-teal-50`, inner box `bg-teal-50/50 border-teal-100/50`, headings `text-slate-800`, accents `text-teal-700/800`, `text-orange-600 bg-orange-100/50`. Add `dark:bg-card dark:border-teal-900/40`, inner `dark:bg-teal-950/30 dark:border-teal-900/50`, title `dark:text-foreground`, accents `dark:text-teal-200 / dark:text-orange-300 dark:bg-orange-950/40`. Empty state `bg-slate-50` → `dark:bg-muted/30 dark:border-border`.

6. **`src/components/governance/LifecycleTelemetry.tsx`** — row `bg-white border-teal-50` and `text-slate-800` → `dark:bg-card dark:border-teal-900/40 dark:text-foreground`. Empty / loading wrappers `bg-slate-50` → `dark:bg-muted/30 dark:border-border`. `PHASE_META` color tokens (`text-slate-600 bg-slate-50 border-slate-100`, orange/amber/teal variants) get dark equivalents (`dark:bg-{color}-950/30 dark:border-{color}-900/50 dark:text-{color}-200`).

7. **`src/components/governance/MSAComplianceCard.tsx`** — `border-teal-50`, row tints `bg-teal-50/30 / amber-50/30 / red-50/30`, `text-slate-700/400`. Add `dark:bg-card dark:border-teal-900/40`, row dark tints `dark:bg-teal-950/20 dark:border-teal-900/40` (and amber/red variants), values `dark:text-foreground`, sublabels `dark:text-muted-foreground`. `textColor` helper gains dark variants (`dark:text-emerald-300 / dark:text-amber-300 / dark:text-red-300`).

8. **`src/components/governance/TreasuryFlows.tsx`** — card and inner rows hardcoded `border-teal-50`, `bg-emerald-50/orange-50` icon chips, `text-slate-700/800/400`, Tooltip `border #e2e8f0` light. Add `dark:bg-card dark:border-teal-900/40`, icon chips `dark:bg-emerald-950/40 dark:text-emerald-300` / `dark:bg-orange-950/40 dark:text-orange-300`, labels `dark:text-foreground / dark:text-muted-foreground`, Recharts Tooltip `contentStyle` switched to use CSS variables (`hsl(var(--popover))`, border `hsl(var(--border))`, color `hsl(var(--popover-foreground))`).

9. **`src/components/governance/CommitteesList.tsx`** (issue #3 — attestation box invisible):
   - List card: `border-teal-100` → add `dark:bg-card dark:border-teal-900/40`.
   - Icon tile `bg-teal-50` → `dark:bg-teal-950/40`, icon `dark:text-teal-300`.
   - Heading `text-foreground` already safe; `text-muted-foreground` safe.
   - Status chips (orange-50, emerald-50, amber-50) → add `dark:bg-*-950/30 dark:border-*-900/50 dark:text-*-300`.
   - Action buttons (`border-teal-200 text-teal-800 hover:bg-teal-50`, red, orange) → add `dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950/40` (and red/orange equivalents).
   - **Apply (Statement of Competence) Dialog** — this is the "committee attestation box":
     - `DialogContent` inherits popover tokens (already dark-aware), but the inner `<Textarea>` and the MSA-acknowledgement block currently rely on default light contrast. Force readable values: textarea uses theme `bg-background border-input text-foreground` (drop any white assumption); the MSA checkbox card / acknowledgment row gets `dark:bg-muted/30 dark:border-border`; warning callouts keyed to amber/orange get `dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50`.
     - Title icon and ACA hash preview text: ensure `text-foreground` / `text-muted-foreground` instead of slate-800/500.

10. **`src/components/governance/CreateDaoProposalModal.tsx`** (issue #2):
    - `DialogContent className="... bg-white"` → drop `bg-white` (DialogContent already uses `bg-popover` token), or replace with `bg-background dark:bg-card`.
    - Title `text-slate-800` → `text-foreground`.
    - All `Label` `text-slate-600` → `text-muted-foreground`.
    - `<Input>` / `<Textarea>` / `<SelectTrigger>` `bg-slate-50 border-slate-200` → `bg-muted/40 border-input text-foreground placeholder:text-muted-foreground` so they render in dark mode.
    - Insufficient-IDIA warning `border-amber-300 bg-amber-50 text-amber-800/600` → add `dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200`.
    - Submit button gradient stays (brand teal works on both). Cancel button is theme-safe via `variant="outline"`.

## Verification

- Toggle dark mode via Settings → Appearance and re-open: GovernanceScreen (Wyoming + Delaware), Submit Proposal modal, Apply-to-Committee modal. Confirm no white-on-white text, no invisible cards, attestation textarea + checkbox visible.
- Light mode should look identical to current — every change is additive (`dark:` prefix or token swap to existing theme variable).

## Out of scope

- Welcome Manual gate, IDIA Governance token gradient card (already dark-safe), and the orange brand accents (intentional in both themes).
- No new tokens added to `index.css` / `tailwind.config.ts`; using existing semantic ones plus tailwind `*-950/900/300/200` shades.
