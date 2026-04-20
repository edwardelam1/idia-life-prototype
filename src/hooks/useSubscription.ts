import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "pro" | "pro_plus" | "pure_alpha" | null;

export const useSubscription = () => {
  const [tier, setTier] = useState<SubscriptionTier>(() => {
    // Session persistence for "No Gating" development
    return (localStorage.getItem("idia_dev_tier") as SubscriptionTier) || null;
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If signed in, prioritize DB record. If not, keep the local dev tier.
      if (user) {
        const { data } = await (supabase
          .from("user_subscriptions" as any)
          .select("tier, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() as any);

        if (data?.tier) {
          setTier(data.tier);
          localStorage.setItem("idia_dev_tier", data.tier);
        }
      }
    } catch (e) {
      console.error("Subscription fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (selectedTier: SubscriptionTier) => {
    setLoading(true);
    // Optimistic local update to bypass gating immediately
    if (selectedTier) {
      setTier(selectedTier);
      localStorage.setItem("idia_dev_tier", selectedTier);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Attempt DB sync if user exists, but don't block the UI if they aren't signed in
    if (user && selectedTier) {
      const { error } = await supabase.from("user_subscriptions" as any).insert({
        user_id: user.id,
        tier: selectedTier,
        status: "active",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      if (error) console.error("DB Sync Error (Non-blocking):", error);
    }

    setLoading(false);
    return true; // Always return true for "No Gating" development
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return { tier, loading, subscribe, refetch: fetchSubscription };
};
