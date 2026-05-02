## Goal

End the current chaos where toasts appear at the top (shadcn `Toaster`) AND bottom-left (sonner), are oversized, and disappear with no history. Replace with a single minimalist notification system anchored next to the user avatar in the Header — with a persistent history log.

## Current State

- Two parallel toast systems are mounted in `src/App.tsx`:
  - `@/components/ui/toaster` (Radix) → renders top of screen on mobile, bottom-right on desktop, large `p-6` cards.
  - `@/components/ui/sonner` (Sonner) → pinned `bottom-left` with inline style `bottom: 5rem`.
- 25+ files dispatch toasts via either `toast()` from sonner or `useToast()` from `@/hooks/use-toast`.
- No persistence: notifications vanish after 4s; user can't review what fired.

## Target Design

A single notification surface with two parts:

1. **Bell icon next to the avatar** in `Header.tsx` (left of the avatar, right of the title). Shows an unread count dot.
2. **Dropdown panel** (Radix Popover) anchored from the bell — compact list of the last 50 events, newest first. Each row: small icon, title, 1-line description, relative timestamp. Mark-all-read + clear actions.
3. **Transient micro-toast** for active feedback: a tiny pill (~`text-xs`, single line, max 240px) that slides in from the bell, auto-dismisses in 3s, and is simultaneously appended to history. No more giant cards.

```text
 ┌──────────────────────────────────────────────┐
 │ [logo] IDIA Life          [🔔³] [👤] [⚙]    │  ← Header
 └────────────────────────────┬─────────────────┘
                              │
                  ┌───────────▼──────────────┐
                  │ Notifications  [✓ all]   │
                  │ ─────────────────────── │
                  │ ✓ Vault linked    2m    │
                  │ ⚠ EIN required   10m   │
                  │ ✓ Profile saved   1h    │
                  │           [Clear all]   │
                  └─────────────────────────┘
```

## Implementation

### 1. New notification store
- Create `src/stores/notificationStore.ts` (zustand-free, simple module + React subscription via `useSyncExternalStore`) holding `Notification[]` (id, level: info/success/warning/error, title, description?, timestamp, read).
- Persist to `localStorage` under `idia_notifications_v1`, cap at 50.

### 2. New unified API
- Create `src/lib/notify.ts` exporting `notify.success/info/warning/error(title, description?)`. It:
  - Pushes to the store (history).
  - Fires a minimalist sonner toast for the transient pill.

### 3. Replace existing systems
- Remove `<Toaster />` (Radix) from `src/App.tsx` — keep only Sonner.
- Reconfigure `src/components/ui/sonner.tsx`:
  - `position="top-right"` so the pill animates from near the bell.
  - Tighter sizing already partly in place; reduce to single-line, `max-w-[240px]`, `duration={3000}`.
- Codemod all 25 callers from `toast({title, description, variant})` and `toast.success(...)` to `notify.success/error(...)`. Old `useToast` hook stays in place as a thin shim that forwards to `notify` so nothing breaks if missed.

### 4. Bell + dropdown component
- Create `src/components/NotificationBell.tsx` using existing `Popover` and the store. Renders bell icon, unread badge, dropdown with list, mark-all-read, clear-all.
- Insert into `src/components/Header.tsx` immediately left of the avatar.

### 5. Cleanup
- Delete unused viewport bottom offset hacks.
- Verify nothing else imports `@/components/ui/toaster`; if so, leave the file but stop mounting it.

## Files Touched

- New: `src/stores/notificationStore.ts`, `src/lib/notify.ts`, `src/components/NotificationBell.tsx`
- Edited: `src/App.tsx` (remove Radix Toaster), `src/components/ui/sonner.tsx` (minimalist + top-right), `src/components/Header.tsx` (add bell), `src/hooks/use-toast.ts` (shim → notify)
- Edited (codemod, mechanical): the 25 caller files listed above to use `notify.*` for cleaner call sites and guaranteed history capture

## Out of Scope

- Server-pushed notifications (this is purely the client surface; the existing `notificationHydrator.ts` can feed into `notify.*` later).
- Per-category filtering in the dropdown (can add later if needed).
