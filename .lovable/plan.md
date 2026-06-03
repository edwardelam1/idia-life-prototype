## Goal

Refactor `src/components/governance/MSAComplianceCard.tsx` (the Oracle Telemetry card) to render one unified 30-day latency view sourced from three real shared-schema tables instead of just `api_metrics`. No changes to `TreasuryFlows.tsx`.

## Data sources (verified against live schema)

1. **Marketplace Bundles** → `public.bundle_generation_logs.processing_duration` (Postgres `interval`).
   - Returned by PostgREST as ISO 8601 string (e.g. `"00:00:01.234"`). Parse client-side to ms: split `HH:MM:SS.fff`, convert to total ms. Fallback `parseFloat` for plain numerics.
   - Channel label: `Marketplace Bundles`.

2. **MCP / API / SQL (Egress)** → `public.egress_logs`, synthesize latency = `new Date(settled_at).getTime() - new Date(created_at).getTime()`. Skip rows where `settled_at` is null.
   - Channel label: `MCP · Egress Delivery`.

3. **Best Friend AI** → `public.api_metrics` where `endpoint = 'best-friend-ai'`, read `latency_ms` directly.
   - Channel label: `Best Friend AI`.

All three queries scoped `.gte(<timestamp_col>, now - 30d)`, `.limit(1000)` each.

## Component behavior

- Parallel `Promise.all` of the three queries on mount + on realtime INSERT (debounced 2s) for all three tables.
- Normalize every row into `{ channel, latency_ms, recorded_at }` via:
  ```ts
  const latencyValueMs = Number(
    row.latency_ms ||
    (row.processing_duration ? parseDurationToMs(row.processing_duration) : 0) ||
    (row.settled_at && row.created_at
      ? new Date(row.settled_at).getTime() - new Date(row.created_at).getTime()
      : 0)
  );
  ```
- Per-channel aggregate (avg + sample count) rendered as three SLA rows (same visual language as today's card) with `meeting` / `warning` / `breach` thresholds against `SLA_BUDGET_MS` (default 250 ms; per-channel overrides allowed in a const map).
- Status dot threshold derived from the live aggregate (no mock vars).
- Empty-state preserved when all three channels return 0 samples.

## Telemetry signatures (replacing current `[GLOBAL_ORACLE_METRICS]` bookends)

```
[ORACLE_TELEMETRY][SHARED_SCHEMA][START]
[ORACLE_TELEMETRY][SHARED_SCHEMA][SUCCESS]   // includes per-channel counts
[ORACLE_TELEMETRY][SHARED_SCHEMA][CRITICAL_FAILURE]
[ORACLE_TELEMETRY][SHARED_SCHEMA][SOCKET_START|SOCKET_EVENT|SOCKET_STATUS|SOCKET_CLOSE]
```

## Files touched

- `src/components/governance/MSAComplianceCard.tsx` — full refactor (single file).

## Out of scope

- No DB migrations; all three tables already exist with the referenced columns.
- No changes to `TreasuryFlows.tsx`, Pro tab, Friend AI, or any other surface.
- No new UI primitives; reuse the card's existing row layout.

## Verification

- Console shows the four new bookended traces and per-table socket status lines.
- Each of the three channels renders a row with a real avg-latency number when sample data exists; missing channels show `—` with `No Samples` substatus.
- Inserting a row into any of the three tables triggers a debounced refresh within ~2s.
