# AI Personalization & Predictive Insights — Pro Series (3 Tiers, Live Wire)

Correction: insights belong in the **Pro tab dashboards**, not the Data tab. Data tab stays connections-only. Pro tab remains hidden from the bottom nav (no change to `isPayReady` gating) and Friend AI remains unmounted — but the three tier dashboards (`HRIDashboard`, `CPMDashboard`, `PureAlphaDashboard`) get live AI insights wired in now so they're ready when Pro is revealed. Zero mock data — every value comes from `staged_health_data` / `raw_health_data` + behavioral signals; empty state is explicit ("Awaiting first sync"), never fabricated.

## Tier-layered insights (all inside Pro tab dashboards)

| Tier | Dashboard | Insights added |
|---|---|---|
| `pro` | `HRIDashboard` | Stress/fatigue 24h forecast, 7/30d longitudinal trend, 1 explainable recommendation, smart-intervention nudge |
| `pro_plus` | `CPMDashboard` | All of `pro` + personalized coaching plan, agentic assistant card (multi-turn via `ai-chat`), clinical-style report block (PDF-ready markup) |
| `pure_alpha` | `PureAlphaDashboard` | All of `pro_plus` + enterprise/cohort wellness analytics (aggregated, RLS-respecting) |

`ProScreen.tsx` routing is untouched — each tier already mounts its dashboard. We only extend the three dashboard components.

## Backend

**New edge function `predictive-insights`** (`verify_jwt = true`):
- Pulls last 30/90d (tier-dependent) from `staged_health_data` + `raw_health_data` + behavioral signals (governance/wallet activity timestamps as low-signal behavioral input — no PII).
- Computes deterministic features server-side (rolling HRV avg, sleep deficit, HR baseline drift, activity cadence, audio-exposure load, walking-asymmetry trend).
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`, `reasoning: { effort: "low" }`) with structured tool-calling. Returns:
  ```
  { forecast: {stress_24h, fatigue_24h, confidence},
    trends: [{metric, window, slope, interpretation}],
    recommendation: {title, body, evidence_refs},
    intervention: {trigger, action, urgency},
    coaching?: {...},        // pro_plus+
    clinical_report?: {...}, // pro_plus+
    cohort?: {...} }         // pure_alpha
  ```
- Accepts `?tier=pro|pro_plus|pure_alpha`; server re-validates against `user_subscriptions` (never trusts client tier).
- Writes to new `insights_cache` table; idempotent on `source_hash` (sha256 of inputs + tier + model) to avoid re-billing.
- Returns `{ from_cache, payload }`. Surfaces 402/429 from gateway verbatim with toast-friendly error.

**New table `public.insights_cache`** (migration):
- Fields: `user_id`, `tier`, `payload jsonb`, `source_hash text unique-per-user`, `model text`, `generated_at`.
- RLS: user SELECT own; INSERT/UPDATE only via service_role (edge function).
- Full GRANT block per house rules (`authenticated` SELECT, `service_role` ALL, no `anon`).

Zero-PII compliant — payload references metric IDs/timestamps/derived scores only.

## Frontend

**New `src/hooks/useInsights.ts`**
- `useInsights(tier)` → invokes `predictive-insights` via `supabase.functions.invoke`.
- Subscribes to `staged_health_data` INSERT for current user → debounced (60s) re-invoke.
- Returns `{ payload, loading, error, refresh }`.
- Bookended telemetry: `[INSIGHTS][FETCH][START]` / `[END:OK|FAIL]` via `stage()` from `src/lib/stageLogger.ts`.

**New `src/components/pro/insights/` folder**
- `ForecastCard.tsx` — stress/fatigue 24h with confidence bar
- `TrendCard.tsx` — longitudinal trend sparkline (uses derived points only, no random)
- `RecommendationCard.tsx` — explainable text + evidence chip links
- `InterventionCard.tsx` — smart-intervention nudge
- `CoachingCard.tsx` — pro_plus+
- `AgenticAssistantCard.tsx` — pro_plus+ (delegates to existing `ai-chat` function, **not** Friend orb)
- `ClinicalReportCard.tsx` — pro_plus+ (markdown render of report block)
- `CohortAnalyticsCard.tsx` — pure_alpha
- All cards use Holographic Shell tokens already in place — no custom colors, semantic tokens only.

**Dashboard wiring (the only touched component files):**
- `src/components/pro/HRIDashboard.tsx` — append Forecast / Trend / Recommendation / Intervention beneath existing HRI metrics; preserves current `staged_health_data` realtime channel.
- `src/components/pro/CPMDashboard.tsx` — append all `pro` cards + Coaching + AgenticAssistant + ClinicalReport.
- `src/components/pro/PureAlphaDashboard.tsx` — append everything above + CohortAnalytics.

Each dashboard renders an explicit empty state when `useInsights` returns no payload (no synced data yet) — "Awaiting first sync from Apple Health / Google Fit / Ford."

## Untouched

- `MainApp.tsx` tab list (Pro stays hidden behind `isPayReady`)
- `ProScreen.tsx` routing
- `SovereignAuth` gate
- `FriendAssistantProvider` (no orb mount)
- `DataDashboard.tsx` (connections only — per directive)
- `release.ts`

## Files

- `supabase/functions/predictive-insights/index.ts` (new)
- `supabase/config.toml` (register function)
- Migration: `insights_cache` + RLS + GRANTs
- `src/hooks/useInsights.ts` (new)
- `src/components/pro/insights/*.tsx` (new folder, ~8 small cards)
- `src/components/pro/HRIDashboard.tsx` (append insights section)
- `src/components/pro/CPMDashboard.tsx` (append insights section)
- `src/components/pro/PureAlphaDashboard.tsx` (append insights section)

## Verification

1. Force-mount Pro tab locally (temporarily flip `isPayReady` in dev only) → with no synced data: empty-state visible on all three dashboards, no fabricated numbers.
2. Trigger Apple Health sync → realtime subscription fires → forecast/trend cards populate within ~60s.
3. `idia_dev_tier` = `pro` shows base set; `pro_plus` adds coaching/agentic/clinical; `pure_alpha` adds cohort.
4. `grep -rn "Math.random\|mock\|fake" supabase/functions/predictive-insights src/components/pro/insights` → zero hits.
5. Pro tab still hidden in nav, Data tab unchanged, Friend orb still not mounted.
