## Goal
When the user taps the sync status badge on a connected data source (e.g. Apple Health), open a small popover that explains every possible status, highlights the current one, and shows when the status last changed.

## UX
- Tap target: the existing badge ("Synced Recently" / "Idle" / "No Data Found" / "Checking...").
- Popover content (mobile-friendly, ~260px wide):
  - Title: "Sync Status"
  - List of all 4 statuses, each row = colored dot + label + one-line description
    - Synced Recently — Data flowed in the last 6 hours.
    - Idle — Last sync was 6–24 hours ago.
    - No Data Found — Source connected but no audit record yet.
    - Checking… — Still verifying the pipe.
  - Active row gets a ring/background highlight + a small "Current" tag.
  - Footer line: "Last change: {relative time} · {absolute timestamp}".

## Technical notes
- File: `src/components/DataDashboard.tsx`.
- Wrap the badge returned by `getSyncStatusBadge()` in `<Popover>` from `@/components/ui/popover` (already in the project). Use `asChild` on `PopoverTrigger` and make the badge `role="button"` + `cursor-pointer` so tap works on iOS.
- Track last status change:
  - Add `lastStatusChangeAt: Date | null` to component state.
  - In `fetchConnections`, when `calculatedSyncStatus` differs from the previous `lastSyncStatus`, set `lastStatusChangeAt = new Date()`. On first load, seed it from the latest `auditData[0].created_at` if present, otherwise `new Date()`.
  - No DB schema changes — purely client-side, derived from the existing `user_aca_records` query already in flight (No-Mock-Data rule respected; nothing fabricated).
- Stop the badge's click bubbling up to the parent connected-source tile (which currently opens the AppleHealthModal): wrap badge in a `<div onClick={(e) => e.stopPropagation()}>` inside `renderSyncBadgeFor`.
- Use semantic tokens for the popover surface; status row colors map to existing tailwind palette already used by the badges (green/yellow/muted).

## Out of scope
- Persisting status-change history to Supabase.
- Changing the per-source sync logic or thresholds.
- Any change to non-Apple-Health connections (Health Connect badge remains null today).