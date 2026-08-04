# Restyle Pro tab to match the Gov tab

Bring the Pro tab (paywall, Life Pro, Life Pro+, Pure Alpha) onto the exact visual language of the Governance tab. No text, data, logic, or feature changes — presentation only.

## The Gov style guide being adopted

- Screen shell: `flex flex-col space-y-5 bg-background min-h-screen p-4 pb-24 animate-in fade-in duration-700`
- Hero card: teal gradient `from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]`, white text, `border-none shadow-xl rounded-[2.5rem]`, big `text-4xl font-black` figure, orange (`text-orange-400`) status icon, footer status strip with pulsing dot and `text-[9px] font-black uppercase tracking-widest`
- Section headers: `text-[10px] font-black uppercase tracking-widest text-muted-foreground` with a small lucide icon, left-padded `px-2`
- Panels: shadcn `Card`/`CardContent`, generous rounding, `bg-card`, subtle border — no ad-hoc colored panels
- Accents: teal as primary, orange (`text-orange-500`) for attention/pending states, emerald for verified/live, red for alerts
- Micro-labels uppercase and black-weight; body copy small and muted

## Changes by file

- **`src/components/pro/HRIDashboard.tsx`** — replace the amber `hsl(28,80%,55%)` header chip, biometric icons and "System Integrity" panel with the teal/orange Gov palette; convert the header into a Gov hero card showing the HRI figure, wrap biometrics and integrity blocks in `Card`, apply Gov section headers and screen shell.
- **`src/components/pro/CPMDashboard.tsx`** — same treatment for the Cognitive Performance screen: teal hero, Gov section headers, `Card`-based panels, tabs restyled to the Gov segmented look; amber/violet accents swapped for teal + orange.
- **`src/components/pro/PureAlphaDashboard.tsx`** — drop the purple `hsl(270,60%,50%)` holographic accents in favor of the teal/orange scheme, same hero + section header + `Card` structure.
- **`src/components/pro/ProPaywall.tsx`** — the three tier cards keep identical names, prices, subtitles and feature lists, but all three use the Gov teal gradient for icon tiles and CTA buttons, with orange reserved for the "popular" marker and current-plan state in emerald; card chrome matches Gov panels.
- **`src/components/pro/SovereignAuth.tsx`** — gate screen restyled to the Gov shell and typography so the tab is consistent before unlock.
- **`src/components/pro/insights/InsightsSection.tsx`**, **`BioTetherLink.tsx`**, **`GhostProtocol.tsx`** — accent-color and header-typography pass only, so nested blocks don't clash.

## Notes

- All colors stay in the same literal HSL form already used across Gov and Pro (no new tokens introduced), and dark mode is preserved by keeping `bg-background` / `bg-card` / `text-foreground` for surfaces.
- No changes to data fetching, HRI/edge-function calls, subscription logic, or gating.
