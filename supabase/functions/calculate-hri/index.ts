// supabase/functions/calculate-hri/index.ts
// Canonical Human Reliability Index (HRI) scorer.
// HRI_total = ( Σ W_i · φ_i(x_i) ) × Π (1 − P_j)
//   i ∈ {sleep, hrv, rt}   W = {0.40, 0.30, 0.30}
//   j ∈ {duress, fraud}    P_j ∈ {0, 1}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { OpenAI } from "https://esm.sh/openai@4.0.0";

// --- ALPHANUMERIC CONVERSION ENGINE ---
function getAlphanumericHRI(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const index = Math.floor(((100 - clamped) / 100) * 259);
  const letter = String.fromCharCode(65 + Math.floor(index / 10));
  const remainder = index % 10;
  const number = remainder === 9 ? 0 : remainder + 1;
  return `${letter}${number}`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function pick(rows: any[], key: string): number | null {
  for (const r of rows) {
    const v = num(r?.[key]);
    if (v !== null) return v;
  }
  return null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const logistic = (x: number) => 1 / (1 + Math.exp(-x));

// --- φ_sleep(SE): logistic decay anchored at the 0.60 critical threshold.
const SLEEP_K = 12;
const phiSleep = (se: number) => logistic(SLEEP_K * (clamp01(se) - 0.6));

// --- φ_hrv(RMSSD): Z-score vs the user's own 30-day baseline, squashed.
const phiHrv = (z: number) => clamp01(logistic(z));

// --- φ_rt(RT): reciprocal-linear across the 100–500 ms window.
const phiRt = (rt: number) => clamp01((500 - rt) / 400);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));

    // --- Identity: prefer the caller's JWT; fall back to explicit user_id for service callers.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (token && token !== serviceKey) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }
    if (!userId && typeof body?.user_id === "string") userId = body.user_id;

    if (!userId) {
      return json({ error: "Unauthorized: no user identity resolved." }, 401);
    }

    console.log(`[HRI][START] user=${userId}`);

    // --- Inputs are read server-side. The client never supplies biometrics.
    const { data: rows, error: readErr } = await supabaseAdmin
      .from("staged_health_data")
      .select(
        "heart_rate, resting_heart_rate, heart_rate_variability_ms, respiratory_rate, sleep_analysis_value, environmental_audio_exposure_db, walking_asymmetry_percentage, walking_speed_kmh, walking_steadiness_percentage, effort_score, created_at",
      )
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);

    if (readErr) {
      console.error("[HRI][READ][FAIL]", readErr.message);
      return json({ error: "Failed to read staged health data." }, 500);
    }

    const r = (rows as any[]) || [];
    const hrv = pick(r, "heart_rate_variability_ms");
    const hr = pick(r, "heart_rate");
    const restingHr = pick(r, "resting_heart_rate");
    const resp = pick(r, "respiratory_rate");
    const sleepRaw = pick(r, "sleep_analysis_value");
    const noise = pick(r, "environmental_audio_exposure_db");
    const asymmetry = pick(r, "walking_asymmetry_percentage");
    const gaitSpeed = pick(r, "walking_speed_kmh");
    const steadiness = pick(r, "walking_steadiness_percentage");

    // Reaction time only arrives from an explicit probe (psychometric / duress gate).
    const reactionTime = num(body?.reaction_time_ms);

    // --- 30-day personal HRV baseline (μ, σ). Fall back only when under-sampled.
    const hrvSamples = r
      .map((row) => num(row?.heart_rate_variability_ms))
      .filter((v): v is number => v !== null);
    let baselineMu = 50;
    let baselineSigma = 15;
    let baselineSource: "personal" | "population" = "population";
    if (hrvSamples.length >= 7) {
      baselineMu = hrvSamples.reduce((a, b) => a + b, 0) / hrvSamples.length;
      const variance =
        hrvSamples.reduce((a, b) => a + (b - baselineMu) ** 2, 0) / hrvSamples.length;
      baselineSigma = Math.sqrt(variance) || 15;
      baselineSource = "personal";
    }

    // --- The three orthogonal axes. Missing axes are dropped and weights renormalised.
    const W = { sleep: 0.4, hrv: 0.3, rt: 0.3 };
    const axes: { key: string; weight: number; value: number }[] = [];

    if (sleepRaw !== null) {
      // sleep_analysis_value may arrive as 0-1 efficiency or as hours slept.
      const se = sleepRaw > 1 ? clamp01(sleepRaw / 8) : clamp01(sleepRaw);
      axes.push({ key: "sleep", weight: W.sleep, value: phiSleep(se) });
    }
    let hrvZ: number | null = null;
    if (hrv !== null) {
      hrvZ = (hrv - baselineMu) / (baselineSigma || 15);
      axes.push({ key: "hrv", weight: W.hrv, value: phiHrv(hrvZ) });
    }
    if (reactionTime !== null) {
      axes.push({ key: "rt", weight: W.rt, value: phiRt(reactionTime) });
    }

    const contributed = axes.map((a) => a.key);
    const weightSum = axes.reduce((a, p) => a + p.weight, 0);

    // Auxiliary context — never blended into HRI_total.
    const auxiliary = {
      heart_rate: hr,
      resting_heart_rate: restingHr,
      respiratory_rate: resp,
      audio_db: noise,
      walking_asymmetry: asymmetry,
      walking_speed_kmh: gaitSpeed,
      walking_steadiness: steadiness,
    };

    // No usable axis => null. Never 0, never 100.
    if (axes.length === 0 || weightSum === 0) {
      console.log(`[HRI][END] user=${userId} insufficient axes (sleep/hrv/rt all absent)`);
      return json({
        hri_raw: null,
        hri_alpha: null,
        duress: false,
        fraud: false,
        veto_reason: null,
        coverage: { contributed: [], count: 0, weight: 0 },
        auxiliary,
        computed_at: new Date().toISOString(),
      });
    }

    const base = (axes.reduce((a, p) => a + p.weight * p.value, 0) / weightSum) * 100;

    // --- P_fraud: strictly reaction-time driven. Cannot fire without an RT probe.
    const pFraud = reactionTime !== null && reactionTime < 100 ? 1 : 0;

    // --- P_duress: only judged when real autonomic evidence exists.
    let pDuress = 0;
    let duressReason: string | null = null;
    const hasAutonomicEvidence = hrv !== null || hr !== null || resp !== null;
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (hasAutonomicEvidence && openAiKey) {
      try {
        const openai = new OpenAI({ apiKey: openAiKey });
        const analysis = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are the IDIA Bio-Oracle. You judge ONLY the vitals provided. " +
                "Reply exactly 'NOMINAL' unless a specific named vital is clearly out of physiological range in a way that implies acute sympathetic dump or coercion. " +
                "If a vital is null, missing, or ambiguous, it is NOT evidence — reply 'NOMINAL'. " +
                "If and only if you have concrete evidence, reply 'DURESS_DETECTED: <named vital and value>'.",
            },
            {
              role: "user",
              content: JSON.stringify({
                heart_rate: hr,
                resting_heart_rate: restingHr,
                hrv_rmssd: hrv,
                hrv_z: hrvZ,
                respiratory_rate: resp,
              }),
            },
          ],
        });
        const reply = analysis.choices[0].message?.content ?? "";
        if (reply.includes("DURESS_DETECTED")) {
          pDuress = 1;
          duressReason = reply.slice(0, 200);
        }
      } catch (e) {
        // Errors and timeouts are nominal, never a veto.
        console.error("[HRI][ORACLE][FAIL]", (e as Error)?.message);
      }
    }

    // Π (1 − P_j)
    const vetoProduct = (1 - pDuress) * (1 - pFraud);
    const finalRaw = base * vetoProduct;
    const finalAlpha = getAlphanumericHRI(finalRaw);
    const vetoReason = pFraud ? "fraud:reaction_time" : pDuress ? (duressReason ?? "duress") : null;

    // --- Ledger write, guarded: only finite numbers ever reach the numeric column.
    if (Number.isFinite(finalRaw)) {
      const { error: insertError } = await supabaseAdmin.from("hri_scores").insert({
        user_id: userId,
        total_score: Number(finalRaw.toFixed(2)),
        hrv_score: hrv,
        alpha_score: finalAlpha,
        is_duress: pDuress === 1,
        is_fraud: pFraud === 1,
        vitals_snapshot: {
          axes: contributed,
          base_score: Number(base.toFixed(2)),
          sleep: sleepRaw,
          hrv,
          hrv_z: hrvZ,
          hrv_baseline: { mu: baselineMu, sigma: baselineSigma, source: baselineSource },
          reaction_time_ms: reactionTime,
          veto_reason: vetoReason,
          auxiliary,
        },
      });
      if (insertError) console.error("[HRI][LEDGER][FAIL]", insertError.message);
    }

    console.log(
      `[HRI][END] user=${userId} base=${base.toFixed(2)} raw=${finalRaw.toFixed(2)} alpha=${finalAlpha} axes=${contributed.join(",")} veto=${vetoReason ?? "none"}`,
    );

    return json({
      hri_raw: finalRaw,
      hri_alpha: finalAlpha,
      base_score: Number(base.toFixed(2)),
      duress: pDuress === 1,
      fraud: pFraud === 1,
      veto_reason: vetoReason,
      coverage: {
        contributed,
        count: contributed.length,
        weight: Number(weightSum.toFixed(2)),
      },
      hrv_baseline: { mu: baselineMu, sigma: baselineSigma, source: baselineSource },
      auxiliary,
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[HRI][FATAL]", error);
    return json({ error: "Edge function failed to process HRI." }, 500);
  }
});
