## Problem

The Settings → IDIA tab uses `EnhancedProfileSettings`, which stacks six full-padding `Card` blocks (Profile, Verification, Credit & Trust, Wallet, Interests, Account Management) plus an oversized 5xl trust score and a redundant page heading. On the 1037×752 viewport the bottom Account Management card and "Upgrade to Business Account" CTA fall below the fold and feel cut off. The page also has heavy `space-y-6`, `p-4` card padding, and large headers that fight the rest of the app's minimalist tone.

## Goal

Reorganize `src/components/enhanced/EnhancedProfileSettings.tsx` and the surrounding `src/pages/Settings.tsx` shell so:

- Every section, including Account Management and the Business upgrade CTA, is reachable without feeling buried.
- Whitespace, padding, and font sizes are tightened to match the minimalist Glossy Light Theme used elsewhere.
- No functionality, data binding, or business-upgrade logic is changed.

## Changes

### 1. `src/components/enhanced/EnhancedProfileSettings.tsx`

Restructure into a compact, scannable layout:

1. **Remove the in-component `H1` "Enhanced Profile"** — `Settings.tsx` already shows a "Settings" page title, so this is duplicate chrome. Keep only the small account-type badge inline at the top of the first card.
2. **Tighten container**: change `p-4 space-y-6 max-w-4xl mx-auto` → `p-2 sm:p-3 space-y-3 max-w-3xl mx-auto`.
3. **Compact every Card**: use `CardHeader className="py-2 px-3"` + `CardTitle className="text-sm font-semibold"` and `CardContent className="px-3 pb-3 pt-0 space-y-2"`. Drop the leading icon size from `w-5 h-5` to `w-4 h-4`.
4. **Profile card**: shrink avatar from `w-20 h-20` → `w-14 h-14`. Put display-name + AI-assistant inputs in a 2-col grid even on mobile-narrow with `gap-2`. Convert the read-only KYC block from a padded `bg-muted` panel into a 2-col `grid` of small label/value rows (`text-xs` labels, `text-sm` values) with a single `border-t pt-2` separator instead of a filled box.
5. **Merge "Verification" + "Credit & Trust" into one Card** titled "Verification & Trust", split into a 2-column grid:
   - Left: KYC status badge with a one-line helper.
   - Right: Trust score reduced from `text-5xl` → `text-3xl font-semibold`, with a small "Trust Score" caption above it.
   This removes one full card and a lot of vertical space.
6. **Wallet card**: keep the 3-up balance grid, but reduce inner tiles from `p-4` to `p-2`, value text from `text-xl` → `text-base font-semibold`, label to `text-[11px] uppercase tracking-wide text-muted-foreground`. Move the seed-backup line into the same card footer with `text-xs`.
7. **Interests card**: keep functionality, switch button size to `size="sm"` already present, but reduce grid gap to `gap-1.5` and make the Save button `size="sm"` aligned right.
8. **Account Management card**: move it ABOVE Interests so it sits in the visible area sooner, and make the upgrade CTA more prominent:
   - Title row + one-line muted helper.
   - The `Upgrade to Business Account` button becomes `variant="default" size="sm"` (still triggers the same Dialog, no logic change).
   - When `account_type !== 'personal'`, render a compact "Business account active" status row instead of an empty card.
9. Keep all hooks, handlers, and the Business Upgrade `Dialog` content exactly as-is — only the trigger button styling changes.

Final card order top-to-bottom:
1. Profile Information (avatar + names + read-only KYC)
2. Verification & Trust (merged)
3. Wallet Information
4. Account Management (with Business upgrade CTA)  ← previously last, now above the fold
5. Your Interests

### 2. `src/pages/Settings.tsx`

Small density pass so the embedded panel has more room:

- Change outer wrapper `py-2 px-2` → `py-2 px-2 sm:px-3` and reduce header `mb-4` → `mb-2`.
- Reduce header text: `text-2xl font-bold` → `text-xl font-semibold`; drop the "Manage your account and preferences" subtitle (redundant with the tabs).
- Tabs: keep 4-col grid but reduce `TabsList` height implicitly via `text-xs` on triggers and remove the per-tab `gap-2` → `gap-1.5`.
- For the `idia-profile` tab content, render `EnhancedProfileSettings` directly (already the case); no Card wrapper around it.
- For Privacy and Notifications tabs, tighten the wrapping `Card` with `CardHeader className="py-2 px-3"` and `CardContent className="px-3 pb-3 pt-0"` to match the new density.

### 3. No other files touched

No schema, hook, or edge-function changes. No business logic changes. No new dependencies.

## Verification

After the edits, on the current 1037×752 viewport:
- The IDIA tab fits Profile + Verification & Trust + Wallet + Account Management within the first scroll, with Interests just below.
- The "Upgrade to Business Account" button is visible without hunting and opens the existing dialog unchanged.
- Spacing matches the rest of the app (no oversized headings, no large filled muted panels, no 5xl trust score).
