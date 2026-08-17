/**
 * Cached auth-user source.
 *
 * `getCachedUser()` is a NETWORK round-trip to the Auth server on every
 * call. This app called it ~90 times across ~60 files, mostly on component
 * mount, which saturated the Auth endpoint and made `/token` sign-in requests
 * time out (504) while every screen waited on its own round-trip.
 *
 * This module keeps a single in-memory copy of the current user, warmed from
 * the local session (no network) and kept fresh by ONE `onAuthStateChange`
 * subscription. Exactly one real `getUser()` revalidation happens per session,
 * at app boot / right after sign-in.
 *
 * Security note: the client-side user id is a convenience only — every write is
 * still enforced server-side by RLS (`user_id = auth.uid()`).
 */
import { supabase } from "@/integrations/supabase/client";
import { getCachedUser } from "@/lib/authUser";
import type { User } from "@supabase/supabase-js";

type UserResult = { data: { user: User | null }; error: null };

let cachedUser: User | null = null;
let warmed = false;
let warmingPromise: Promise<void> | null = null;
let subscribed = false;
let revalidated = false;

const setUser = (user: User | null) => {
  cachedUser = user;
  warmed = true;
};

/** Subscribe once — every future auth transition updates the cache for free. */
const ensureSubscription = () => {
  if (subscribed) return;
  subscribed = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    // A brand new session deserves one server-side verification.
    if (session?.user) revalidated = false;
  });
};

/** Warm the cache from local storage — no network call. */
const warm = async (): Promise<void> => {
  if (warmed) return;
  if (!warmingPromise) {
    warmingPromise = supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      })
      .catch(() => setUser(null))
      .finally(() => {
        warmingPromise = null;
      });
  }
  await warmingPromise;
};

/**
 * Drop-in replacement for `getCachedUser()`.
 * Same return shape, but served from cache instead of the network.
 */
export const getCachedUser = async (): Promise<UserResult> => {
  ensureSubscription();
  await warm();
  return { data: { user: cachedUser }, error: null };
};

/** Synchronous peek — may be null before the cache is warm. */
export const peekCachedUser = (): User | null => cachedUser;

/**
 * The ONE real `getUser()` per session: verifies the token against the Auth
 * server and refreshes the cache. Safe to call repeatedly; it no-ops after the
 * first success until the next auth state change.
 */
export const revalidateUser = async (): Promise<User | null> => {
  ensureSubscription();
  if (revalidated) {
    await warm();
    return cachedUser;
  }
  revalidated = true;
  try {
    const { data, error } = await getCachedUser();
    if (error) {
      setUser(null);
      return null;
    }
    setUser(data.user ?? null);
    return cachedUser;
  } catch {
    await warm();
    return cachedUser;
  }
};

/** Prime the cache at app start. */
export const initAuthUserCache = () => {
  ensureSubscription();
  void warm();
};
