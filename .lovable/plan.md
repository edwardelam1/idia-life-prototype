# Global Ledger Wiring — TreasuryFlows + MSAComplianceCard

Pivot both governance surfaces off the stagnant diagnostic tables (`dao_treasury_flows`, `dao_msa_metrics`) and onto the live, multi-tenant ledger / telemetry already flowing through the platform. Zero mock data; no schema changes.

## Verified data sources (live)

- `public.synapse_credit_ledger` — every credit movement in the marketplace billing engine. Columns used: `entry_type`, `amount`, `description`, `metadata`, `created_at`. Observed `entry_type` values today: `deposit`, `CREDIT`, `revenue` (ingress); `USAGE`/`usage`, `DEBIT`, `escrow`, `ADJUSTMENT` (egress). Spec mentions `action_type`/`direction` and `'top_up'`/`'data_purchase'` — the live column is `entry_type` with the values above. Mapping reconciled below.
- `public.api_metrics` — `endpoint`, `latency_ms`, `status_code`, `timestamp`. Real latency from execution workers; used for the Oracle SLA handshake.
- `marketplace_purchases` does **not** exist; `marketplace_bundles` is a catalog table with no purchase rows. Data-purchase volume lives entirely in `synapse_credit_ledger` egress entries, which is what we'll sum.

## 1. TreasuryFlows refactor (`src/components/governance/TreasuryFlows.tsx`)

- Replace the `dao_treasury_flows` select with:
  ```ts
  supabase
    .from("synapse_credit_ledger")
    .select("id, entry_type, amount, description, metadata, created_at")
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);
  ```
- Normalize each row into the existing `Flow` shape:
  - `direction`: lowercase `entry_type` ∈ {`deposit`,`credit`,`revenue`,`top_up`} → `"in"`; everything else (`usage`,`debit`,`escrow`,`adjustment`,`data_purchase`,`split`,`payout`) → `"out"`.
  - `amount_usd`: `Math.abs(Number(row.amount))`.
  - `asset`: `(metadata?.asset as string) ?? "SYN"`.
  - `counterparty_label`: derived label (see §3).
  - `recorded_at`: `created_at`.
- Realtime subscription: swap channel to `synapse_credit_ledger` with `event:'INSERT'`. Re-run the same fetcher on event.
- Chart aggregation logic is unchanged (buckets by `MM-DD`, sums `in`/`out`).

## 2. MSAComplianceCard refactor (`src/components/governance/MSAComplianceCard.tsx`)

- Replace `dao_msa_metrics` select with a 24h roll-up of `api_metrics`:
  ```ts
  supabase
    .from("api_metrics")
    .select("endpoint, latency_ms, status_code, timestamp")
    .gte("timestamp", new Date(Date.now() - 86400000).toISOString())
    .limit(1000);
  ```
- Client-side reduce → one synthetic `MSA` row per `endpoint`:
  - `sla_name`: endpoint.
  - `current_value`: avg `latency_ms`.
  - `target_value`: fixed SLA budget per endpoint (constant map, default 250 ms).
  - `status`: `meeting` if avg ≤ target, `warning` if ≤ 1.5× target, `breach` otherwise. Force `breach` when any 5xx in the window.
- Realtime channel listens to `api_metrics` inserts (debounced 2 s).

## 3. PII-safe counterparty resolution

Extend `sanitizeCounterparty` with a deterministic fallback derived from `entry_type` (after UUID stripping):
- `deposit` / `credit` / `revenue` → `"Corporate Capitalization"`
- `usage` / `debit` → `"Enterprise Data Purchase"`
- `escrow` → `"Validator Security Fee"`
- `adjustment` → `"Sovereign Pool Dividend"`
- default → `"Network Settlement"`

Apply *before* the UUID-stripping fallback so the public Atomic Settlements feed never leaks raw `description`/`metadata` text containing emails, wallet addresses, or user ids. Strip 0x-hex strings of length ≥ 16 in addition to UUIDs.

## 4. Trace telemetry (exact signatures)

TreasuryFlows fetch/socket replaces existing `[TREASURY_FLOWS]` lines with:
- `[GLOBAL_TREASURY_FLOWS] START: Initializing multi-tenant ledger aggregation pass.`
- `[GLOBAL_TREASURY_FLOWS] SUCCESS: Gathered total transaction entities for graph matrix extrapolation.`
- `[GLOBAL_TREASURY_FLOWS] CRITICAL_FAILURE: Global telemetry bridge stalled. Reason: <err.message>`
- `[GLOBAL_TREASURY_FLOWS] SOCKET_START: Listening for aggregate network modifications on synapse channels.`
- `[GLOBAL_TREASURY_FLOWS] SOCKET_EVENT: Aggregate ledger mutation detected. Re-extrapolating…`
- `[GLOBAL_TREASURY_FLOWS] SOCKET_CLOSE: Tearing down aggregate synapse listener.`

MSAComplianceCard gets a parallel `[GLOBAL_ORACLE_METRICS]` bookended set (START / SUCCESS / CRITICAL_FAILURE / SOCKET_START / SOCKET_EVENT / SOCKET_CLOSE).

## 5. Out of scope

- No migrations. `dao_treasury_flows` / `dao_msa_metrics` tables remain in the DB but are no longer read. The `dao-treasury-ingest` edge function is left untouched.
- No UI/layout changes — same cards, same chart, same list rows.
- No Pro-tier / Friend-AI changes.

## Files touched

- `src/components/governance/TreasuryFlows.tsx`
- `src/components/governance/MSAComplianceCard.tsx`

## Verification

- Console shows the new bookended traces and a non-zero `SUCCESS` count.
- Chart 30-day series populated from real `synapse_credit_ledger` rows (currently 139 rows in the table → expect data).
- Oracle Telemetry lists one row per distinct endpoint in `api_metrics` over 24h, with live latency.
- No UUIDs, emails, or wallet addresses appear in Recent Atomic Settlements labels.
