## Summary
Restyle the top banner cards in **WalletDashboard.tsx** and **DataDashboard.tsx** to match the visual language of the Governance page's IDIA Governance Token card (source of truth).

## Source of Truth (GovernanceScreen.tsx)
The top card uses these exact design tokens:
- **Gradient:** `bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]`
- **Shape:** `rounded-[2.5rem]` (40px), `border-none`, `shadow-xl`, `overflow-hidden`
- **Padding:** `p-7`
- **Label text:** `text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60`
- **Value text:** `text-4xl font-black`
- **Layout:** flex row with label/value on left, icon on right, plus an optional bottom link strip with `border-t border-white/10 pt-4`

## Changes

### 1. WalletDashboard.tsx — "Your Balances" banner
**Current:** `bg-gradient-to-r from-teal-500 to-cyan-600 text-white overflow-hidden` with `p-4`, default Card radius, no shadow, `text-lg font-bold` label, grid layout.
**Target:** Match Governance card style.
- Swap gradient to `from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]`
- Add `rounded-[2.5rem] border-none shadow-xl`
- Increase padding to `p-7`
- Restructure layout: left side with label + two values, right side with a wallet/shield icon
- Update label to `text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60`
- Update USDC value to `text-4xl font-black`
- Update IDIA value to smaller sub-line under the main value (or keep both prominent)
- Add bottom strip showing chain/network status (reuses existing logic)

### 2. DataDashboard.tsx — USDC banner
**Current:** `bg-gradient-to-r from-teal-500 to-cyan-600 text-white` with `p-4`, default radius, `text-3xl font-bold`, icon inside a `w-16 h-16 bg-white/20 rounded-full` on the right.
**Target:** Match Governance card style.
- Swap gradient to `from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]`
- Add `rounded-[2.5rem] border-none shadow-xl`
- Increase padding to `p-7`
- Update label to `text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60`
- Update USDC value to `text-4xl font-black`
- Keep right-side DollarSign icon but style it like Governance's ShieldCheck (no circle bg, just icon with drop shadow)
- Add bottom strip (optional: sync status or connected sources count)

## Technical Details
- Both changes are purely presentational — no logic, state, or data-fetching changes.
- The `useWalletBalance` hook already provides `balance.usdc_balance` and `balance.idia_token_balance` to both pages.
- No new dependencies needed.
- Files affected: `src/components/WalletDashboard.tsx`, `src/components/DataDashboard.tsx`