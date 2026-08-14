# Fix HRI reading 0% — duress veto is firing on empty vitals

## Confirmed root cause

The last seven rows written to `hri_scores` (six of them today, 16:59–17:00 UTC) all have `total_score = 0.00`, `alpha_score = Z0`, `is_fraud = false` and **`is_duress = true`**. Their `vitals_snapshot` shows `hr`, `hrv`, `resting_hr`, `respiratory_rate`, `sleep` all null, with only `walking_asymmetry: 0.11` contributing.

So the composite math is not what produces the zero. The score is being computed from the single available signal and then annihilated by the duress veto: `finalRaw = isFraud || isDuress ? 0 : composite`. The GPT-4o-mini "Bio-Oracle" is handed a payload of nulls and answers `DURESS_DETECTED`, because a prompt that asks "does this imply coercion" with no vitals has nothing to say no to.

Second confirmed fact: over the last 30 days `staged_health_data` holds 8,214 rows with **0** HRV, 0 heart rate, 0 resting HR, 0 respiratory rate, 0 sleep, and 1,539 walking-speed / 298 asymmetry values. None of the three axes the framework specifies (sleep, HRV, reaction time) are currently in the pipeline.

## The fix

### 1. Implement the framework equation exactly

Rewrite the scoring core of `supabase/functions/calculate-hri/index.ts` to the specified composite:

```text
HRI_total = ( Σ W_i · φ_i(x_i) ) × Π (1 − P_j)      i ∈ {sleep, hrv, rt},  j ∈ {duress, fraud}
```

with `W_sleep = 0.40`, `W_hrv = 0.30`, `W_rt = 0.30`, and:

- `φ_sleep(SE) = 1 / (1 + e^(−k(SE − 0.60)))`, k = 12, SE clamped to [0,1]; hours-slept inputs normalised as `SE = hours / 8`.
- `φ_hrv(RMSSD) = Φ(Z)` where `Z = (RMSSD − μ) / σ` against the user's **own 30-day baseline** computed server-side from `staged_health_data` (fall back to μ=50, σ=15 only when the user has fewer than 7 baseline samples). Mapped through a logistic so the lower asymptote is the stress penalty, not a negative number.
- `φ_rt(RT)` reciprocal-linear across the 100–500 ms window: `(500 − RT) / 400`, clamped.
- Any axis with no input is dropped and the remaining weights are renormalised, so a partial reading is a real partial reading rather than a silent zero.

### 2. Stop the duress oracle from zeroing an empty payload

- The oracle only runs when there is genuine autonomic evidence to judge — HRV, heart rate or respiratory rate present. With none of them, `P_duress = 0` and the veto cannot fire.
- Tighten the prompt: require the model to return `NOMINAL` unless a specific named vital is out of range, and treat any non-`DURESS_DETECTED` reply (including errors and timeouts) as nominal.
- `P_fraud` stays strictly reaction-time-driven: fires only when an explicit RT probe returns `< 100 ms`. It cannot fire when RT is absent.
- Vetoes apply as the multiplicative `(1 − P_j)` product from the equation, and the response reports which veto fired so the UI can say "duress hold" instead of showing a bare 0%.

### 3. Keep secondary signals out of the headline number

Resting HR, respiratory rate, acoustic exposure and gait currently masquerade as HRI axes. Under the framework they are not part of `HRI_total`. They move to a separate `auxiliary` block in the response — displayed as context, never blended into the score.

### 4. Honest state when the three axes are empty

Today that is the real situation. With no sleep, HRV or RT, the function returns `hri_raw: null` plus `coverage: { contributed: [], ... }`, and the three dashboards already render "Insufficient biometrics" for null. No fabricated percentage.

### 5. Ledger hygiene

Only write to `hri_scores` when the score is a finite number, and record `duress_reason` / contributed axes in `vitals_snapshot`. The six identical zero rows from today are veto artefacts; they stay as history but will stop accumulating.

## Technical notes

- Edited: `supabase/functions/calculate-hri/index.ts` (scoring core, baseline query, oracle gating, response shape). Deploys automatically.
- Edited: `src/hooks/useHRI.ts` to surface `duress` reason and the `auxiliary` block; the three dashboards keep reading from the hook unchanged.
- No schema migration.
- Expect the score to read "Insufficient biometrics" until sleep, HRV or a reaction-time probe reaches `staged_health_data` — that is the accurate state, and it replaces a 0% that currently reads as "you failed" rather than "we have no data".
