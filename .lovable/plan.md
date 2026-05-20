## 1. Lower proposal gate for testing

File: `src/components/governance/CreateDaoProposalModal.tsx`

- Change `MIN_IDIA_TO_PROPOSE` from `1` to `0` so any balance qualifies.
- Remove the title/description/category required-field check in `handleSubmit` so submissions go through with empty fields (or default placeholders inserted at submit time like `"(untitled)"` / `"(no description)"` / `"other"` to satisfy DB NOT NULL constraints).
- Drop the `hasInsufficientBalance` + missing-field conditions from `submitDisabled` (keep only `isSubmitting`).
- Hide the amber "Insufficient IDIA" warning block.
- Leave the `validate-proposal` edge call intact — it just scores; nothing client-side blocks based on score.

Marked clearly with a `// TEMP: testing — gate disabled` comment so it's easy to restore.

## 2. Pop-out notification detail view

Pattern mirrors the wallet History tab, where clicking a transaction row opens a receipt dialog with full content.

File: `src/components/NotificationBell.tsx`

- Add local state `selectedNotification: NotificationItem | null`.
- Make each `<li>` row clickable; on click, set `selectedNotification` (and close the popover).
- Render a `<Dialog>` below the popover showing:
  - Level icon + title (full, no truncation)
  - Full timestamp (locale string)
  - Full `description` (no `line-clamp`, scrollable if long)
  - Footer with "Mark read" / "Delete" / "Close" buttons wired to `notificationStore.remove(id)` etc.
- Keep the existing list-row layout (truncation in the dropdown is fine since detail is now reachable).

No store/schema changes needed — `NotificationItem` already carries `title`, `description`, `timestamp`, `level`, `id`.

## Out of scope

- Backend / edge function changes
- Proposal validation scoring logic
- Notification persistence schema