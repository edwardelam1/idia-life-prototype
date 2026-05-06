## Problem

The "Purge Identity" button in Settings → Privacy currently only calls `supabase.auth.signOut()` and redirects home. It does NOT delete the user from `auth.users`, does NOT remove their public-schema rows, and does NOT clear on-device PII from the Secure Enclave. This is a regulatory (GDPR/CCPA right-to-erasure) violation.

## Fix

Implement a true, irreversible purge in three coordinated layers: edge function (server-side deletion), client (Secure Enclave + local storage wipe), and UI (re-confirm + progress states).

### 1. New edge function: `purge-identity`

`supabase/functions/purge-identity/index.ts`

- `verify_jwt = false`; validate JWT in code using a user-context client (`SUPABASE_ANON_KEY` + caller `Authorization` header) → `getUser()`. If invalid, return 401.
- Spin up an admin client with `SUPABASE_SERVICE_ROLE_KEY`.
- Delete all rows owned by `userId` across every public-schema table that has a `user_id` column. Discover tables dynamically via `information_schema.columns` (RPC) OR enumerate the known tables: `profiles`, `wallets`, `user_interests`, `user_preferences`, `user_roles`, `notifications`, `consent_records`, `connections`, `endorsements`, `praises`, `proposals`, `votes`, `health_data_bundles`, `ford_tokens`, `strava_tokens`, `business_memberships`, `employees`, plus any reward/ledger tables. We will run a discovery query first to build the exhaustive list and codify it.
- Delete the auth user last: `adminClient.auth.admin.deleteUser(userId)`.
- Return `{ ok: true, purged_tables: [...] }` with CORS headers. Wrap each delete in try/catch so a missing table doesn't abort the run; collect errors and return them.

### 2. Client purge handler (`PrivacySettings.tsx`)

Replace `deleteAccount` with a sequenced flow:

```text
1. Show "Purging…" loading state (disable button)
2. Invoke edge function: supabase.functions.invoke('purge-identity')
3. On success, wipe device PII:
   - SecureStoragePlugin.remove({ key: 'user_pii_profile' })
   - SecureStoragePlugin.clear() for any other known keys (recovery phrase, vault, etc.)
   - localStorage.clear() and sessionStorage.clear()
4. supabase.auth.signOut({ scope: 'global' })
5. Toast confirmation, hard redirect to '/'
6. On failure → destructive toast, do NOT sign out, log error
```

### 3. UI confirmation hardening

In the existing AlertDialog: add a typed-confirmation input ("Type PURGE to confirm") so the destructive action requires intentional acknowledgment. Keep current copy about irreversibility.

## Technical details

**Files to create**
- `supabase/functions/purge-identity/index.ts`

**Files to edit**
- `src/components/settings/PrivacySettings.tsx` — replace `deleteAccount`, add typed confirmation, loading state.

**Discovery step before writing the function**
Run a `read_query` against `information_schema.columns` to enumerate every public table containing a `user_id` (uuid) column. Use that result to build the deletion list inside the edge function. This guarantees no orphan rows remain.

**Secure Enclave keys to clear** (from existing code: `useSecureProfile`, `localPIIVault`, `vaultGuard`, `RecoveryPhrase`, `SecureVault`)
- `user_pii_profile`
- Any recovery-phrase / seed / vault keys present in `src/lib/localPIIVault.ts` and `src/pages/SecureVault.tsx` — will enumerate during implementation and clear each.

**Security**
- Service role key stays server-side only.
- JWT validated before any deletion.
- No client-side admin SDK usage.

**Out of scope** (won't touch unless asked)
- On-chain wallet key destruction (Sovereign Wallet keys live in Secure Enclave; clearing the enclave entries effectively orphans them. True on-chain "burn" is not possible.)
- Backups / point-in-time recovery (Supabase platform-level; user can be informed via copy update if desired).