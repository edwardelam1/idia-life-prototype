import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCachedUser, peekCachedUser } from "@/lib/authUser";

/**
 * React access to the cached auth user. Renders from cache immediately and
 * stays in sync with auth state changes — no per-component network calls.
 */
export const useAuthUser = () => {
  const [user, setUser] = useState<User | null>(() => peekCachedUser());
  const [loading, setLoading] = useState(() => peekCachedUser() === null);

  useEffect(() => {
    let mounted = true;

    getCachedUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};

export default useAuthUser;
