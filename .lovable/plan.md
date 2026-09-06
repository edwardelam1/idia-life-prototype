# Expose FordConnect Modal + Restyle Available Source Cards

## Goal
1. Surface the FordConnect connection flow from the Data page (it currently exists but is unreachable).
2. Make the "Available Data Sources" cards (Health, Ford) visually match the "Active Streams" look: circular icon, thin padding, label underneath.

## What changes

### 1. DataDashboard.tsx — wire in Ford (only file with logic changes)
- Import `FordConnectionModal` and add `showFordModal` state.
- **Available Data Sources section:**
  - Show a **FordConnect** card whenever there is no active `ford` connection (`hasFord` check, same pattern as `hasHealth`). Clicking it opens `FordConnectionModal`.
  - Show the Health card as today when no health connection exists.
  - The "All available sources connected" message only appears when **both** health and ford are connected.
- **Active Streams section:**
  - Add `"ford"` to the `visibleConnections` filter so a connected Ford renders as an active stream (currently the filter would hide it).
  - Clicking the Ford active-stream circle opens `FordConnectionModal` (manage/revoke view), same as health does today.
- Render `<FordConnectionModal>` at the bottom next to the two health modals, with `onComplete`/`onDisconnect` refetching connections, `existingConnection={getConnectionStatus("ford")}`.

### 2. Cosmetic restyle of Available Data Sources cards (Health + Ford)
- Replace the current square card (`p-4 bg-card rounded-2xl border`) with the Active Streams look:
  - `flex flex-col items-center` column, no card box.
  - Circular icon well: `w-16 h-16 rounded-full bg-background border border-border shadow-sm` with a subtle `group-hover:scale-105` transition (thin ring, matching the active stream circles but without the emerald "live" border/pulse dot).
  - Label underneath: `text-[10px] font-bold mt-2 uppercase tracking-wider text-muted-foreground`, plus the small category caption (e.g. "Biometrics" / "Vehicle Telemetry") below it.
- Grid becomes `flex flex-wrap gap-6` to mirror Active Streams spacing.

### Ford card icon
- Blue `Car` (lucide) icon inside the circle, consistent with the FordConnectionModal branding.

## Explicitly out of scope
- No changes to `AppleHealthModal.tsx` — it stays byte-for-byte as-is.
- No changes to `FordConnectionModal.tsx` logic (biometrics, OAuth handoff, recovery net all remain as built).
- No edge function or database changes.

## Verification
- Build passes (`tsgo` clean).
- Visual check in preview: Available Sources shows circular Health + Ford cards with thin padding; clicking Ford opens the FordConnect modal; connected Ford appears under Active Streams.
