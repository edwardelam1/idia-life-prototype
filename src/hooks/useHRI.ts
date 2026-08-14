import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HRICoverage {
  contributed: string[];
  count: number;
  weight: number;
}

export interface HRIResult {
  /** Authoritative HRI percentage (0-100), or null when inputs are insufficient. */
  score: number | null;
  alpha: string | null;
  coverage: HRICoverage | null;
  duress: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Single source of truth for the Human Reliability Index.
 * Every Pro tier (Pro, Pro+, Pure Alpha) must read the score from here —
 * never derive it locally from staged metrics.
 */
export function useHRI(enabled = true): HRIResult {
  const [score, setScore] = useState<number | null>(null);
  const [alpha, setAlpha] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<HRICoverage | null>(null);
  const [duress, setDuress] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("calculate-hri", {
        body: {},
      });
      if (invokeErr) throw invokeErr;
      if ((data as any)?.error) throw new Error((data as any).error);

      const raw = (data as any)?.hri_raw;
      setScore(typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : null);
      setAlpha((data as any)?.hri_alpha ?? null);
      setCoverage((data as any)?.coverage ?? null);
      setDuress(!!(data as any)?.duress);
    } catch (e: any) {
      console.error("[HRI][EDGE][FAIL]", e?.message ?? e);
      setError(e?.message ?? "Failed to compute HRI");
      setScore(null);
      setAlpha(null);
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchOnce();
  }, [enabled, fetchOnce]);

  // Refresh when new staged biometrics land for this user (debounced).
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`hri_stream_${uid}`)
        .on(
          "postgres_changes" as any,
          {
            event: "INSERT",
            schema: "public",
            table: "staged_health_data",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => fetchOnce(), 15_000);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [enabled, fetchOnce]);

  return { score, alpha, coverage, duress, loading, error, refresh: fetchOnce };
}
