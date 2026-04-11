

# Complete the Life-to-Hub PII Bridge

## What This Does
When a user completes onboarding or updates their profile in IDIA Life, their PII is pushed to `auth.users.user_metadata` (encrypted at rest by Supabase Auth). The Hub app's `life-pii-bridge` edge function reads this metadata and returns it in-memory only — no PII in the `profiles` table.

## Changes

### 1. Create `life-pii-bridge` Edge Function
`supabase/functions/life-pii-bridge/index.ts`
- Validates the caller's JWT (authenticated users only)
- Reads PII from `auth.users.user_metadata` via the admin API (`supabase.auth.admin.getUserById`)
- Returns `{ display_name, email, full_name, first_name, last_name }` — no DB writes
- This is the bridge the Hub app will call on session start
- No mock data — reads real `user_metadata` set by IDIA Life

### 2. Update Onboarding (`src/pages/Onboarding.tsx`)
- After saving PII to Secure Enclave, call `supabase.auth.updateUser({ data: { full_name, first_name, last_name, display_name, pii_synced_at } })`
- This pushes PII into `user_metadata` so the bridge can read it
- Remove the `display_name` write to the `profiles` table (line 91-94) — profiles will be zero-PII
- The `user_metadata` update is NOT a backend DB write — it's an Auth API call that stores data in the `auth.users` row (managed by Supabase, not our public schema)

### 3. Update Profile Settings Save (`src/components/settings/ProfileSettings.tsx`)
- On PII save, also call `supabase.auth.updateUser()` to sync changes to `user_metadata`
- This ensures edits in Settings propagate to Hub via the bridge

### 4. Update `useSecureProfile` Hook
- Add a `syncToAuth()` helper that pushes current PII to `user_metadata`
- Called after every `save()` operation automatically

### 5. Update `ProfileMenu.tsx` — Read from Secure Enclave
- Currently reads `user.user_metadata?.full_name` — this will continue to work since we're writing to `user_metadata`
- No change needed here

### 6. Stop Writing PII to `profiles` Table
- Remove `display_name` update from Onboarding (line 91-94)
- The `profiles` table will only hold `platform_guid`, `avatar_url`, `account_type`, non-PII metadata
- The `handle_new_user()` trigger already only inserts `user_id` — no changes needed there

## Files
| File | Action |
|------|--------|
| `supabase/functions/life-pii-bridge/index.ts` | **Create** — authenticated PII pass-through |
| `src/pages/Onboarding.tsx` | Update — push PII to `user_metadata`, remove `display_name` DB write |
| `src/components/settings/ProfileSettings.tsx` | Update — sync PII to `user_metadata` on save |
| `src/hooks/useSecureProfile.ts` | Update — add `syncToAuth()` method |

## Security
- PII in `user_metadata` is encrypted at rest by Supabase Auth
- `life-pii-bridge` requires valid JWT — no anonymous access
- PII never stored in public schema tables
- Bridge is read-only — no DB mutations

