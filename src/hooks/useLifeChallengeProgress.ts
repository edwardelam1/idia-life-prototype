import { useCallback, useEffect, useState } from "react";
import { getCachedUser } from "@/lib/authUser";
import { supabase } from "@/integrations/supabase/client";

type ProgressRow = {
  assessment_completed_at: string | null;
  wave_one_celebrated_at: string | null;
};

export type LifeChallengeState = {
  assessment: boolean;
  connection: boolean;
  goodDeed: boolean;
  dataSource: boolean;
  proposalVote: boolean;
};

const EMPTY: LifeChallengeState = {
  assessment: false,
  connection: false,
  goodDeed: false,
  dataSource: false,
  proposalVote: false,
};

export function useLifeChallengeProgress() {
  const [state, setState] = useState<LifeChallengeState>(EMPTY);
  const [celebrated, setCelebrated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    console.log("[LIFE_CHALLENGE_REFRESH][BEGIN]");
    try {
      const { data: auth } = await getCachedUser();
      const user = auth?.user;
      if (!user) return;

      const [progress, connections, deeds, sources, votes] = await Promise.all([
        supabase
          .from("life_challenge_progress")
          .select("assessment_completed_at, wave_one_celebrated_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("friends")
          .select("id")
          .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
          .eq("status", "accepted")
          .limit(1),
        supabase.from("good_deeds").select("id").eq("user_id", user.id).eq("verification_status", "verified").limit(1),
        supabase.from("data_connections").select("id").eq("user_id", user.id).eq("is_active", true).limit(1),
        supabase.from("dao_votes").select("id").eq("user_id", user.id).limit(1),
      ]);

      const firstError = [progress.error, connections.error, deeds.error, sources.error, votes.error].find(Boolean);
      if (firstError) throw firstError;

      const row = progress.data as ProgressRow | null;
      setState({
        assessment: Boolean(row?.assessment_completed_at),
        connection: Boolean(connections.data?.length),
        goodDeed: Boolean(deeds.data?.length),
        dataSource: Boolean(sources.data?.length),
        proposalVote: Boolean(votes.data?.length),
      });
      setCelebrated(Boolean(row?.wave_one_celebrated_at));
      console.log("[LIFE_CHALLENGE_REFRESH][END:OK]");
    } catch (error) {
      console.error("[LIFE_CHALLENGE_REFRESH][END:FAIL]", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const writeTimestamp = useCallback(async (field: "assessment_completed_at" | "wave_one_celebrated_at") => {
    console.log(`[LIFE_CHALLENGE_WRITE][BEGIN] ${field}`);
    const { data: auth } = await getCachedUser();
    const user = auth?.user;
    if (!user) throw new Error("Sign in required");
    const now = new Date().toISOString();
    const { data: existing, error: selectError } = await supabase
      .from("life_challenge_progress")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selectError) throw selectError;
    if (existing) {
      const { error } = await supabase.from("life_challenge_progress").update({ [field]: now }).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("life_challenge_progress").insert({ user_id: user.id, [field]: now });
      if (error) throw error;
    }
    if (field === "assessment_completed_at") setState((current) => ({ ...current, assessment: true }));
    if (field === "wave_one_celebrated_at") setCelebrated(true);
    console.log(`[LIFE_CHALLENGE_WRITE][END:OK] ${field}`);
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return {
    state,
    celebrated,
    loading,
    refresh,
    markAssessmentComplete: () => writeTimestamp("assessment_completed_at"),
    markCelebrated: () => writeTimestamp("wave_one_celebrated_at"),
  };
}
