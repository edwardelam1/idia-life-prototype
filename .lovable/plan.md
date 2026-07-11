## Problem

Life, Shop, and the Pro dashboards (HRI, CPM, Pure Alpha) were built with a hardcoded glossy-light aesthetic. Their root containers and cards use `bg-white` / `bg-slate-*` / `text-slate-*` utilities, which ignore the theme, so in dark mode the middle section renders as a big white block.

## Scope

Presentation-only change. No logic, no data, no component structure. Swap hardcoded neutrals for semantic tokens so the same UI adapts to `.dark`.

## Token mapping

- `bg-white` (page/container/card surface) → `bg-background` for page shells, `bg-card` for cards, popovers, dialogs
- `bg-slate-50` / `bg-slate-50/30` / `bg-slate-50/50` (subtle surface) → `bg-muted` or `bg-muted/50`
- `border-slate-50` / `border-slate-100` / `border-slate-200` → `border-border`
- `text-slate-900` / `text-slate-700` → `text-foreground`
- `text-slate-500` / `text-slate-400` / `text-slate-300` → `text-muted-foreground`
- `bg-slate-900 text-white` (active pill/button) → `bg-primary text-primary-foreground`
- Keep semantic accent colors (teal, orange, amber) — those are brand, not neutral surface

Explicit exclusions (do not touch):
- Chart fills / SVG stroke colors that encode data
- Gamma-warning orange states
- Trust-Blue / Amber brand accents

## Files to edit

1. `src/components/enhanced/LifeScreen.tsx` — replace `bg-white` on the root wrapper, Cards, and DialogContent with `bg-card` / `bg-background`; borders → `border-border`.
2. `src/components/ShopScreen.tsx` — root `bg-white min-h-screen` → `bg-background min-h-screen`; search input, category pills, product tiles, sticky detail header, merchant cards → `bg-card` + `border-border`; unselected pill text → `text-muted-foreground`.
3. `src/components/pro/HRIDashboard.tsx` — the panel `bg-white` → `bg-card`.
4. `src/components/pro/CPMDashboard.tsx` — root wrapper `bg-white min-h-screen` → `bg-background min-h-screen`; inner panels/cards `bg-white` → `bg-card`; slate borders/text → semantic tokens; Tooltip content → `bg-popover text-popover-foreground border-border`.
5. `src/components/pro/PureAlphaDashboard.tsx` — same treatment as CPM: root `bg-white` → `bg-background`; view-switcher pills active `bg-slate-900 text-white` → `bg-primary text-primary-foreground`, inactive `bg-white … border-slate-200` → `bg-card … border-border`; log rows and empty states `bg-white` → `bg-card`; muted panels → `bg-muted/50`.

## Verification

- Toggle Settings → Appearance → Dark, then visit Life, Shop, Pro → HRI, Pro → CPM, Pro → Pure Alpha, and confirm no white slab; also toggle back to Light and confirm no visual regression.
- Grep after edit: `rg "bg-white|bg-slate-|text-slate-|border-slate-" src/components/enhanced/LifeScreen.tsx src/components/ShopScreen.tsx src/components/pro/{HRI,CPM,PureAlpha}Dashboard.tsx` should return only intentional brand/data-color usages.
