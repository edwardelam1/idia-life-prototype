# Fix Avatar Upload — Persist & Reflect in Header

## Root cause

Three bugs prevent the uploaded photo from replacing the EE initials:

1. **No `avatars` storage bucket exists.** The migrations only create `deed-evidence`, `business-kyb-docs`, and `business-logos`. `supabase.storage.from("avatars").upload(...)` therefore fails — but the error is caught and only logged, so the UI shows no failure.
2. **No RLS policies on `storage.objects` for avatars.** Even after the bucket is created, authenticated users need INSERT/UPDATE/SELECT policies scoped to their own folder.
3. **`updateProfile` uses `.update().single()` on a row that may not exist** for the current user. With no profile row, the update affects 0 rows and `.single()` throws — `avatar_url` is never persisted, so `Header` keeps rendering the initials fallback.

A secondary issue: the upload writes to `avatars/${userId}.${ext}` inside the `avatars` bucket, producing the path `avatars/avatars/<file>`. The leading `avatars/` folder must be removed so the public URL resolves and so RLS folder-ownership checks (`(storage.foldername(name))[1] = auth.uid()::text`) work.

## Changes

### 1. Migration — create `avatars` bucket + RLS

New SQL migration:

- `INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT DO NOTHING;`
- Policies on `storage.objects` for bucket `avatars`:
  - Public SELECT (anyone can read; bucket is public so the Header `<img>` resolves).
  - Authenticated INSERT/UPDATE/DELETE restricted to `bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text`.

Avatar URL on `profiles` is already permitted by the Sovereign PII memory ("avatar" is non-sensitive metadata), so no new PII concerns.

### 2. `src/hooks/useEnhancedProfile.ts` — `uploadAvatar`

- Store under `${user.id}/avatar.${ext}` (user-id folder, single file per user, `upsert: true`). Drop the `avatars/` prefix from the path.
- Append a cache-busting query param (`?t=${Date.now()}`) to the public URL so browsers immediately swap the image instead of serving the cached old one.
- Surface a toast on success/failure (currently silent on failure — the user sees nothing happen).

### 3. `src/hooks/useEnhancedProfile.ts` — `updateProfile`

- Replace `.update(...).eq("user_id", user.id).select().single()` with `.upsert({ user_id: user.id, ... }, { onConflict: "user_id" }).select().single()` so the avatar (and other edits) persist even when the profile row hasn't been created yet.
- After a successful upsert, merge returned row into local `profile` state (already done) — guarantees Header re-renders with the new `avatar_url` because `useEnhancedProfile` is shared by `EnhancedProfileSettings` and `Header`.

### 4. (No changes needed) Header & Settings render

`Header.tsx` already reads `profile.avatar_url` via `useEnhancedProfile` and falls back to initials only when null. Once the URL persists, both the header avatar and the settings avatar update automatically.

## Out of scope

- No changes to nav, other tabs, FriendOrb, NotificationBell, or any unrelated profile fields.
- No PII columns added — `avatar_url` is already on `profiles`.
- No image cropping/resizing pipeline; the uploaded image is used as-is in a circular `<Avatar>`.
