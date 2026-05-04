# Move Sync Badge to Connection Icon

**STRICT BOUNDARY**: Only `src/components/DataDashboard.tsx` is edited.

## Change

The sync badge (Idle / Synced Recently / No Data Found / Checking…) currently sits next to the "USDC" label on the teal balance card. It will be:

1. **Removed** from the USDC card header (the `USDC` label stays on its own).
2. **Rendered directly underneath the Apple Health icon** in the "Connected Data Sources" section, tethered to that specific source.

The badge logic (`getSyncStatusBadge()`) and the `lastSyncStatus` state remain unchanged — only its render location moves. It is scoped to Apple Health, since `lastSyncStatus` is derived from `apple_health` ACA records.

## Per-source design (future-proofing)

To make it clear each future connection owns its own badge:

- Wrap the badge call in a small helper `renderSyncBadgeFor(connectionType)` that, for now, returns the existing badge only when `connectionType === "apple_health"` and otherwise returns null.
- When new sources (Strava, Ford, Nike, Google Fit) are added later, each will get its own state slice and its own branch in this helper. No global "sync status" badge.

## Layout (Connected Data Sources)

```text
[ Apple Health icon w/ green check ]
        Synced Recently
```

The icon stays centered; the badge appears centered directly below it with a small top margin (`mt-2`). The icon container becomes a vertical flex stack (`flex flex-col items-center`) so the badge is visually tethered to that single source. Multiple connected sources continue to lay out horizontally (`space-x-8`), each with its own icon + badge stack.

## Empty state

When Apple Health is not yet connected (shown in "Available Data Sources"), no badge renders — the badge only appears once a connection row exists in `connections`.

## Out of scope

- USDC balance, amount, subtitle text, gradient styling — untouched.
- Tabs, header, other tabs, edge functions — untouched.
- No new state, no schema changes.
