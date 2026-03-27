import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'pro' | 'pro_plus' | 'pure_alpha' | null;

export const useSubscription = () => {
  const [tier, setTier] = useState<SubscriptionTier>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_subscriptions' as any)
        .select('tier, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setTier((data as any)?.tier ?? null);
    } catch (e) {
      console.error('Subscription fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (selectedTier: SubscriptionTier) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedTier) return false;

    const { error } = await supabase
      .from('user_subscriptions' as any)
      .insert({
        user_id: user.id,
        tier: selectedTier,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);

    if (error) { console.error('Subscribe error:', error); return false; }
    setTier(selectedTier);
    return true;
  };

  useEffect(() => { fetchSubscription(); }, []);

  return { tier, loading, subscribe, refetch: fetchSubscription };
};
