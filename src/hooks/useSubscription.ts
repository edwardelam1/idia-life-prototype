import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "pro" | "pro_plus" | "pure_alpha" | null;

const TIER_RANK = { null: 0, pro: 1, pro_plus: 2, pure_alpha: 3 };

export const useSubscription = () => {
  const [tier, setTier] = useState<SubscriptionTier>(
    () => (localStorage.getItem("idia_dev_tier") as SubscriptionTier) || null,
  );
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await (supabase
          .from("user_subscriptions" as any)
          .select("tier")
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
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (selectedTier: SubscriptionTier) => {
    if (!selectedTier) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Logic for upgrade vs downgrade
    const currentRank = TIER_RANK[tier as keyof typeof TIER_RANK] || 0;
    const nextRank = TIER_RANK[selectedTier as keyof typeof TIER_RANK];
    const isUpgrade = nextRank > currentRank;

    setTier(selectedTier);
    localStorage.setItem("idia_dev_tier", selectedTier);

    if (user) {
      await supabase.from("user_subscriptions" as any).insert({
        user_id: user.id,
        tier: selectedTier,
        status: "active",
        expires_at: new Date(Date.now() + 2592000000).toISOString(),
      } as any);
    }
    return true;
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return { tier, loading, subscribe, refetch: fetchSubscription };
};
