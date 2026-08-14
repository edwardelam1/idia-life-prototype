# Fix: one HRI value across Pro, Pro+ and Pure Alpha

## What's actually wrong

Three different numbers because only one tab talks to the edge function, and that call is broken.

1. **Pro shows "—"**: `HRIDashboard` invokes `calculate-hri` with only `{ user_id }`. The deployed function destructures `sleep_efficiency`, `hrv_rmssd` and `reaction_time_ms` from the body — all `undefined`. Every formula then produces `NaN`: `phi_sleep`, `phi_hrv`, `phi_rt`, and therefore `total_raw_score`. The insert into `hri_scores.total_score` (numeric) rejects `NaN`, the function throws into its catch block and returns a 500 with `{ error }`, so the client's `hri_raw` is never a number and renders as a dash. This is consistent with `hri_scores` holding exactly one row (`total_score = 0`, written 2026-08-02) — nothing since.
2. **Pure Alpha shows 100%**: it never calls the function. It renders `Math.round(data_quality_score * 100)` from the newest `staged_health_data` row, and every staged row has `data_quality_score = 1.0`.
3. **Pro+ shows 0%**: same `data_quality_score * 100` formula, but its query takes the newest row globally by `recorded_at` with no user filter; the value comes back empty and `|| 0` yields 0%.

Data quality score is an ingestion-confidence flag, not a health score. Two of the three tabs are displaying a fabricated number.

**Second finding, equally important:** the inputs the function is built on are not in the pipeline. Across the last 14 days of `staged_health_data` (3,602 rows) the counts are: HRV 0, resting heart rate 0, heart rate 0, respiratory rate 0, sleep 0, effort 0. What is populated is steps (2,219), walking speed (684) and gait asymmetry (179). So even after the call is repaired, sleep/HRV/reaction-time weighting has nothing to score. The honest output today is a partial score plus a stated coverage, not a full-confidence percentage.

## The fix

**One server-side source of truth, one client hook, three consumers.**

### 1. Bring `calculate-hri` into the repo and repair it
Add `supabase/functions/calculate-hri/index.ts` mirroring what's deployed, with these corrections:
- **CORS**: import `corsHeaders` from `npm:@supabase/supabase-js@2/cors`, answer `OPTIONS`, and attach the headers to every response including errors.
- **Auth**: resolve the user from the caller's JWT and score that user; keep an explicit `user_id` only for service-role callers.
- **Server-side inputs**: the function reads the user's recent `staged_health_data` itself and picks the latest non-null value per metric, rather than trusting the client to send `sleep_efficiency` / `hrv_rmssd` / `reaction_time_ms`. The client stops passing biometrics entirely.
- **Missing-input handling**: each sub-score is skipped when its input is absent instead of turning into `NaN` or a silent zero. The composite is the weighted average over the sub-scores that actually have data, re-normalised across the weights used, and the response carries `coverage` (which inputs contributed).
- **No inputs at all → `hri_raw: null`**, not 0, not 100. Insufficient data must read as insufficient data.
- **Guard the insert**: only write to `hri_scores` when the score is a finite number, so a bad computation can't 500 the whole request.
- Keep the existing alphanumeric grading, duress detection and the `is_fraud` reaction-time veto intact — the veto simply won't fire while reaction time is absent.

### 2. Add a shared `useHRI` hook
`src/hooks/useHRI.ts` wraps the single invoke and exposes `{ score, alpha, coverage, duress, loading, error }`, refreshing on new `staged_health_data` inserts for the signed-in user (debounced, cleaned up on unmount). One call site means the tabs can't drift onto private formulas again.

### 3. Rewire all three dashboards
- `HRIDashboard` (Pro): drop the inline invoke, use the hook.
- `CPMDashboard` (Pro+): delete `hriScore: Math.round(data_quality_score * 100)` from both the initial fetch and the realtime handler; use the hook. Also scope its `staged_health_data` query to the signed-in user instead of the newest global row.
- `PureAlphaDashboard`: delete its `data_quality_score` derivation in both places; use the hook.

All three render `—` with a short "Insufficient biometrics" note when the score is null, and the identical `NN%` plus alpha class when it isn't. No tab keeps a fallback formula.

## Technical notes

- New: `supabase/functions/calculate-hri/index.ts` (deploys automatically, overwriting the current dashboard-only copy with the CORS/auth/null-safe version), `src/hooks/useHRI.ts`.
- Edited: `src/components/pro/HRIDashboard.tsx`, `src/components/pro/CPMDashboard.tsx`, `src/components/pro/PureAlphaDashboard.tsx`.
- No schema migration — `hri_scores` already has `total_score`, `hrv_score`, `alpha_score`, `vitals_snapshot`, `is_duress`, `is_fraud`.
- The function keeps using `OPENAI_API_KEY` for duress analysis, unchanged.
- Expect the repaired score to display as a partial reading with low coverage until HRV, sleep and resting heart rate actually reach `staged_health_data`. Making that visible is the point — the current 100% is hiding it.
