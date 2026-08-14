# Fix: one HRI value across Pro, Pro+ and Pure Alpha

## What's actually wrong

The three tabs are not showing the same number because they are not reading the same thing — and the one that is supposed to be authoritative does not exist.

1. **Pro shows "—"**: `HRIDashboard` calls the edge function `calculate-hri`. There is no `calculate-hri` function in `supabase/functions/` (verified — the only insight-related function deployed is `predictive-insights`). Every invoke fails, so the score stays null and renders as a dash.
2. **Pure Alpha shows 100%**: it does not call the edge function at all. It computes `Math.round(data_quality_score * 100)` from the newest `staged_health_data` row. Every one of the 27,949 staged rows has `data_quality_score = 1.0`, so it always renders 100%.
3. **Pro+ shows 0%**: same `data_quality_score * 100` formula, but its query selects the newest row by `recorded_at` with no user filter, and that row's quality value comes back empty, so `|| 0` yields 0%.

Also relevant: `hri_scores` holds exactly 1 row, `total_score = 0`, last written 2026-08-02 — nothing is populating it. And `heart_rate_variability_ms` is null on every staged row, so any HRV-weighted score has to handle missing inputs honestly rather than defaulting them to zero.

Data quality score is not the HRI. Using it as a stand-in is why two tabs display invented numbers.

## The fix

**One server-side source of truth, one client hook, three consumers.**

### 1. Create the `calculate-hri` edge function
- Authenticates the caller from the JWT; scores only that user.
- Reads that user's recent `staged_health_data` (rolling window, most recent rows first) and picks the latest non-null value per input metric — same "pick" strategy Pro already uses for its biometrics grid.
- Computes sub-scores from real inputs only: cardiac (heart rate), autonomic (HRV), respiratory, acoustic exposure, gait symmetry. Each sub-score is skipped when its input is missing; the total is the weighted average over the inputs that actually exist, plus a coverage figure saying how many of the five contributed.
- Returns `null` for the score — not 0, not 100 — when no scoring input is present. Insufficient data must read as "insufficient data".
- Writes the result to `hri_scores` (`total_score`, `hrv_score`, `alpha_score`, `vitals_snapshot`) so there is an audit trail, then returns `{ hri_raw, hri_alpha, coverage, computed_at }`.

### 2. Add a shared `useHRI` hook
Wraps the single invoke, exposes `{ score, alpha, coverage, loading, error }`, and refreshes on new `staged_health_data` inserts for the signed-in user (debounced, cleaned up on unmount). This makes it impossible for a tab to drift onto its own formula again.

### 3. Rewire all three dashboards
- `HRIDashboard` (Pro): drop its inline invoke, use the hook.
- `CPMDashboard` (Pro+): delete `hriScore: Math.round(data_quality_score * 100)`, use the hook. Also scope its `staged_health_data` query to the signed-in user rather than relying on the newest global row.
- `PureAlphaDashboard`: delete its `data_quality_score` derivation (both initial fetch and realtime handler), use the hook.

All three render `—` with an "Insufficient biometrics" note when the score is null, and the same `NN%` plus alpha class when it is not. No tab keeps a local fallback formula.

## Technical notes

- New file: `supabase/functions/calculate-hri/index.ts` (plus config entry). Deploys automatically.
- New file: `src/hooks/useHRI.ts`.
- Edited: `src/components/pro/HRIDashboard.tsx`, `src/components/pro/CPMDashboard.tsx`, `src/components/pro/PureAlphaDashboard.tsx`.
- No schema migration needed — `hri_scores` already has the columns used (`total_score`, `hrv_score`, `alpha_score`, `vitals_snapshot`, `is_ghost_protocol`).
- `data_quality_score` stays where it belongs: an ingestion-confidence indicator, never a health score.
- Since HRV is null across all current rows, expect the live score to be driven by heart rate, respiratory, acoustic and gait until HRV ingestion lands — the coverage figure will make that visible instead of hiding it.
