# Fix slow login and sluggish app after sign-in

## What's actually happening

The auth logs for the last few minutes show two things:

- A storm of `GET /user` requests — dozens within seconds — several of them taking 3-7 seconds each (one took 7.4s).
- `POST /token` (the actual sign-in call) timing out at 10s with `504 request_timeout`, twice, before finally succeeding on retry, plus one `500 error finding user: context canceled`.

The cause is in the app, not the provider. `supabase.auth.getUser()` is a **network round-trip to the Auth server every single time it is called**, and the codebase calls it **89 times across 58 files** — almost all of them inside `useEffect` on component mount. When the dashboard mounts after login, dozens of these fire simultaneously against the same Auth server that is concurrently trying to process the `/token` sign-in. The Auth endpoint gets saturated, sign-in queues behind the flood and times out, and every screen afterwards waits on its own round-trip before it can render.

`ConsentGate` makes it worse: it calls `getUser()` again on **every route change**, so each tab switch adds another blocking network call before anything renders.

## The fix

Introduce one cached auth-user source and route everything through it.

1. **New `src/hooks/useAuthUser.ts` + `src/lib/authUser.ts`**
   - A module-level cache of the current user, populated once at app start from `supabase.auth.getSession()` (local, no network) and kept fresh by a single `onAuthStateChange` subscription.
   - `getCurrentUser()` — async, returns the cached user immediately; falls back to `getSession()` if the cache isn't warm yet.
   - `useAuthUser()` — React hook returning `{ user, loading }` for components.
   - A single `revalidateUser()` that performs one real `getUser()` at app boot (and after sign-in) so we still verify against the Auth server exactly once per session, per security guidance.

2. **Replace the per-component `getUser()` calls** with `getCurrentUser()` / `useAuthUser()`. This is a mechanical swap across the 58 files; the returned shape stays `{ id, email, user_metadata }` so call sites barely change. Highest-impact files first (these mount together on the main screens): `ConsentGate`, `ProfileMenu`, `Settings`, `DataDashboard`, `GovernanceScreen`, and the whole `src/components/governance/*` set.

3. **`ConsentGate`** — read from the cache and drop the `location.pathname` dependency so it stops re-fetching on every navigation. Consent metadata only changes when the user attests, which already triggers an auth state refresh.

4. **Keep write paths honest** — anywhere the user id gates a mutation, the server-side RLS policy (`user_id = auth.uid()`) remains the real check, so using the cached id on the client changes no security boundary.

## Expected result

Sign-in issues one `/token` call with no competing traffic, so the 504 timeouts stop. After login the dashboard renders from cached session state instead of waiting on 20+ serial network round-trips.

## Not included

No changes to sign-in logic itself (Google, Apple, or email), the vault guard, or the session sentinel — those are correct; they were just starved of Auth server capacity.
