Refactor `src/components/governance/MSAComplianceCard.tsx` to render four SLA channels instead of three.

## Channel matrix

| ID | Label | Source | Latency derivation | SLA budget |
|---|---|---|---|---|
| bundles | Marketplace Bundles | public.bundle_generation_logs | parseDurationToMs(processing_duration) | 2000 ms |
| api_mcp | API & MCP Gateways | public.api_metrics where endpoint IN ('mcp-gateway','sql-endpoint') | latency_ms | 500 ms |
| best_friend_ai | Best Friend AI | public.api_metrics where endpoint = 'best-friend-ai' | latency_ms | 250 ms |
| egress | Global Egress Delivery | public.egress_logs | settled_at − created_at (ms) | 1500 ms |

## Changes (single file)

1. Extend `ChannelId` union to include `api_mcp`. Add `CHANNEL_LABELS` and `SLA_BUDGET_MS` entries for all four channels.
2. Replace the 3-way `Promise.all` fetch with a 4-way fetch: bundles, api_metrics filtered via `.in('endpoint',['mcp-gateway','sql-endpoint'])`, api_metrics filtered via `.eq('endpoint','best-friend-ai')`, egress_logs.
3. Wrap per-channel sample-to-row mapping in `React.useMemo` so parsing is not redone on unrelated re-renders. Each channel uses its own parser:
   - bundles → parseDurationToMs (existing helper, handles ISO 8601, HH:MM:SS, numeric)
   - api_mcp + best_friend_ai → Number(latency_ms) with Number.isFinite guard
   - egress → ms delta guarded against null settled_at
4. Keep `statusFor(avg, target, samples)`; ensure 0-sample channels uniformly return `idle` and render with the existing neutral slate dot and "No Samples" label. No NaN can reach status math.
5. Realtime socket: no additional table subscriptions needed — the existing channel already listens on bundle_generation_logs, egress_logs, and api_metrics (which feeds both api_mcp and best_friend_ai rows).
6. Preserve these three console signatures verbatim:
   - `[ORACLE_TELEMETRY][SHARED_SCHEMA][START] Syncing multi-tenant delivery latency profiles from live tables.`
   - `[ORACLE_TELEMETRY][SHARED_SCHEMA][SUCCESS] Performance profiles calculated successfully.`
   - `[ORACLE_TELEMETRY][SHARED_SCHEMA][CRITICAL_FAILURE] Latency collection pass stalled: <err.message>`
   - Existing `[SOCKET_START|EVENT|STATUS|CLOSE]` bookends remain untouched.

## Scope

- One file: `src/components/governance/MSAComplianceCard.tsx`
- No DB migrations, no edge-function changes, no schema changes
- No changes to TreasuryFlows.tsx, GovernanceScreen.tsx, or any other surface
- UI primitives unchanged; the 4th row reuses the existing row layout