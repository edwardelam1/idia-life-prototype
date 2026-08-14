// supabase/functions/calculate-hri/index.ts
// Canonical Human Reliability Index (HRI) scorer.
// Single source of truth for Pro, Pro+ and Pure Alpha.
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

// Latest non-null value for a key across rows ordered newest-first.
function pick(rows: any[], key: string): number | null {
  for (const r of rows) {
    const v = num(r?.[key]);
    if (v !== null) return v;
  }
  return null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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
        "heart_rate, resting_heart_rate, heart_rate_variability_ms, respiratory_rate, sleep_analysis_value, environmental_audio_exposure_db, walking_asymmetry_percentage, walking_speed_kmh, effort_score, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

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

    // Reaction time only arrives from an explicit probe (psychometric / duress gate).
    const reactionTime = num(body?.reaction_time_ms);

    // --- Sub-scores. Each is skipped entirely when its input is absent.
    // No NaN, no silent zeros.
    const parts: { key: string; weight: number; value: number }[] = [];
    const add = (key: string, weight: number, value: number) =>
      parts.push({ key, weight, value: clamp01(value) });

    if (sleepRaw !== null) {
      // sleep_analysis_value may arrive as 0-1 efficiency or as hours slept.
      const efficiency = sleepRaw > 1 ? clamp01(sleepRaw / 8) : clamp01(sleepRaw);
      add("sleep", 0.3, 1 / (1 + Math.exp(-15 * (efficiency - 0.6))));
    }
    if (hrv !== null) {
      const baselineMu = num(body?.baseline_mu) ?? 50;
      const baselineSigma = num(body?.baseline_sigma) ?? 15;
      const z = (hrv - baselineMu) / (baselineSigma || 15);
      add("hrv", 0.25, (z + 3) / 6);
    }
    if (reactionTime !== null) {
      add("reaction_time", 0.15, 1 - (reactionTime - 200) / 300);
    }
    if (restingHr !== null) {
      // 45 bpm -> 1.0, 90 bpm -> 0.0
      add("resting_heart_rate", 0.1, (90 - restingHr) / 45);
    } else if (hr !== null) {
      add("heart_rate", 0.1, (110 - hr) / 60);
    }
    if (resp !== null) {
      // Optimal band 12-16 br/m, degrading outward.
      const deviation = Math.abs(resp - 14);
      add("respiratory", 0.1, 1 - deviation / 10);
    }
    if (noise !== null) {
      // 50 dB or below -> 1.0, 100 dB -> 0.0
      add("acoustic", 0.05, (100 - noise) / 50);
    }
    if (asymmetry !== null) {
      // 0% asymmetry -> 1.0, 10% -> 0.0
      add("gait_symmetry", 0.05, (10 - asymmetry) / 10);
    } else if (gaitSpeed !== null) {
      // 5 km/h -> 1.0, 1 km/h -> 0.0
      add("gait_speed", 0.05, (gaitSpeed - 1) / 4);
    }

    const contributed = parts.map((p) => p.key);
    const weightSum = parts.reduce((a, p) => a + p.weight, 0);

    // No usable inputs => null. Never 0, never 100.
    if (parts.length === 0 || weightSum === 0) {
      console.log(`[HRI][END] user=${userId} insufficient inputs`);
      return json({
        hri_raw: null,
        hri_alpha: null,
        duress: false,
        coverage: { contributed: [], count: 0, weight: 0 },
        computed_at: new Date().toISOString(),
      });
    }

    const composite =
      (parts.reduce((a, p) => a + p.weight * p.value, 0) / weightSum) * 100;

    // --- Fraud / duress vetoes.
    const isFraud = reactionTime !== null && reactionTime < 100;
    let isDuress = false;
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (openAiKey) {
      try {
        const openai = new OpenAI({ apiKey: openAiKey });
        const analysis = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are the IDIA Bio-Oracle. Analyze vitals for Acute Sympathetic Dump or Fraud. Reply with DURESS_DETECTED if metrics imply coercion/attack.",
            },
            {
              role: "user",
              content: JSON.stringify({
                vitals_snapshot: { hr, resting_hr: restingHr, hrv, resp, noise, asymmetry },
                reaction_time_ms: reactionTime,
              }),
            },
          ],
        });
        isDuress =
          analysis.choices[0].message?.content?.includes("DURESS_DETECTED") || false;
      } catch (e) {
        console.error("[HRI][ORACLE][FAIL]", (e as Error)?.message);
      }
    }

    const finalRaw = isFraud || isDuress ? 0 : composite;
    const finalAlpha = getAlphanumericHRI(finalRaw);

    // --- Ledger write, guarded: only finite numbers ever reach the numeric column.
    if (Number.isFinite(finalRaw)) {
      const { error: insertError } = await supabaseAdmin.from("hri_scores").insert({
        user_id: userId,
        total_score: Number(finalRaw.toFixed(2)),
        hrv_score: hrv,
        alpha_score: finalAlpha,
        is_duress: isDuress,
        is_fraud: isFraud,
        vitals_snapshot: {
          hr,
          resting_hr: restingHr,
          hrv,
          respiratory_rate: resp,
          audio_db: noise,
          walking_asymmetry: asymmetry,
          walking_speed_kmh: gaitSpeed,
          sleep: sleepRaw,
          contributed,
        },
      });
      if (insertError) console.error("[HRI][LEDGER][FAIL]", insertError.message);
    }

    console.log(
      `[HRI][END] user=${userId} raw=${finalRaw.toFixed(2)} alpha=${finalAlpha} coverage=${contributed.join(",")}`,
    );

    return json({
      hri_raw: finalRaw,
      hri_alpha: finalAlpha,
      duress: isDuress,
      fraud: isFraud,
      coverage: {
        contributed,
        count: contributed.length,
        weight: Number(weightSum.toFixed(2)),
      },
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[HRI][FATAL]", error);
    return json({ error: "Edge function failed to process HRI." }, 500);
  }
});
