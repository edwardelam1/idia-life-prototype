# Finish the Pro tab restyle: insights, warnings, Ghost Protocol

Presentation-only pass to bring the remaining Pro surfaces onto the Gov teal/orange style guide. No text content, data, or logic changes.

## What's off today

- **Predictive Insights** panels use `bg-white/80` cards with a mixed accent set (`text-primary`, rose, ad-hoc teal), so they read as a different product from the teal Gov shell above them. They appear identically under Pro, Pro+ and Pure Alpha, so all three inherit the mismatch.
- **Life Pro+ hero text** on the Cognitive Performance screen uses different weighting/label structure than the Gov hero used on the other tabs.
- **Photosensitivity warning dialog** is amber-on-white (`bg-white/95`, amber border, amber CTA) — off-palette and unreadable in dark mode.
- **Ghost Protocol** honey-pot screen uses hardcoded `bg-white` cards and a blue avatar tile with white text on a light surface.

## Changes

- **`src/components/pro/insights/InsightsSection.tsx`**
  - Local `Card` becomes a Gov panel: `rounded-2xl border border-border bg-card shadow-sm`, teal icon, section title at `text-[10px] font-black uppercase tracking-widest text-muted-foreground`.
  - Accents normalized to teal `hsl(178,42%,32%)` primary, orange for urgency/intervention, emerald for confirmed, red reserved for clinical red flags.
  - Section header row ("AI Predictive Insights" + tier badge), loading, error and empty states restyled to the same shell so they match while data is pending.
  - Inner stat tiles use `bg-muted/30` with `border-border/50`, matching the HRI biometric grid.

- **`src/components/pro/CPMDashboard.tsx`** — hero title block aligned to the exact Gov hero pattern used on HRI/Pure Alpha (same eyebrow, `text-4xl font-black` title, footer status strip). Text stays "Cognitive Performance" / "Life Pro+".

- **`src/components/pro/GammaPhotosensitivityWarning.tsx`** — dialog moves to `bg-card` with `border-border`, teal-tinted icon medallion, orange used for the risk emphasis word and the confirm CTA, Gov uppercase black-weight typography. Copy unchanged.

- **`src/components/pro/GhostProtocol.tsx`** — honey-pot screen swaps every `bg-white` for `bg-card`, blue avatar tile becomes the teal gradient, metric tiles get Gov borders and typography, and text tokens become `foreground` / `muted-foreground` so contrast holds in both themes.

- **`src/components/pro/PureAlphaDashboard.tsx`** — small cleanup of leftover `divide-slate-50` and `border-white bg-white` circles to semantic border/card tokens so the Pure Alpha panels match.

## Notes

- Colors keep the same literal HSL form already used across Gov and Pro; surfaces use `bg-card` / `bg-background` / `text-foreground` so dark mode is correct everywhere.
- No changes to insights fetching, gamma consent/ACA anchoring, duress detection, or subscription gating.
