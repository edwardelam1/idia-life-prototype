# Hide Life/Shop until 12/31, center data sources, add Ford connection

## 1. Push the Life/Shop release gate to 12/31

`src/config/release.ts` currently unlocks on 2026-08-31, so Life and Shop are already visible. Move `IDIA_PAY_RELEASE_DATE` to `2026-12-31T00:00:00Z`.

Effect: Life and Shop disappear from the bottom tab bar (`MainApp.tsx` already gates them on this date) and their steps are skipped in the welcome tour highlight sequence (`WelcomeSequence.tsx` already gates `life`, `shop`, `pro` the same way). No other code change needed.

## 2. Center both data-source sections

On the Data tab, "Available Data Sources" uses a left-aligned 2/3-column grid and "Active Streams" uses a left-aligned wrap row. Both get centered:

- Available grid: switch to a centered flex-wrap row (`flex flex-wrap justify-center gap-6`) so one or two tiles sit in the middle instead of hugging the left edge.
- Active Streams: add `justify-center` to the existing flex-wrap row.
- Section headings stay as they are unless you want them centered too.

## 3. Match the available-source tile to the active-stream circle

Available tiles currently render a `p-4` card with a border, a 14x14 icon well, and a 2-line label — visually heavier than the active-stream circles. Restyle so the two sections mirror each other:

- Drop the card padding/border/background from the available tile; render just a 16x16 circular avatar (`w-16 h-16 rounded-full`, same shadow, dashed/neutral border instead of the emerald ring) with the icon centered.
- Keep the same label typography as active streams (`text-[10px] font-bold uppercase tracking-wider`), and swap the live green dot for a subtle "+"/connect indicator in the same corner position.

Result: available and connected sources are the same size and shape, differing only in ring color and status dot.

## 4. Wire up the Ford data source

`FordConnectionModal.tsx` and the three Ford edge functions (`ford-auth-url`, `ford-oauth-callback`, `ford-vehicle-data`) already exist, but the Data tab never renders the modal, so Ford is unreachable. Changes in `DataDashboard.tsx`:

- Import `FordConnectionModal` and the existing `src/assets/ford-logo.png`, add a `showFordModal` state.
- Add a Ford tile to Available Data Sources (shown when no active `ford` connection exists) that opens the modal.
- Include `ford` in `visibleConnections` so a connected Ford appears as an Active Stream on all platforms, clicking it reopens the modal for status/disconnect.
- Refresh connections + ACA records on modal completion, and support disconnect through the modal's existing revoke path.

On credentials: the Ford edge functions already read `FORD_CLIENT_ID` and `FORD_CLIENT_SECRET` from Supabase secrets at request time, and both secrets are present. Since the values were updated in Supabase, the functions will be redeployed so they pick up the current values; no key is hardcoded anywhere.

## Technical details

- Files touched: `src/config/release.ts`, `src/components/DataDashboard.tsx`.
- Redeploy: `ford-auth-url`, `ford-oauth-callback`, `ford-vehicle-data` (no code change, just to bind the refreshed secrets).
- No database migration required.
