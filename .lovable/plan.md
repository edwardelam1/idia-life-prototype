

# Plan: Add Google Sign-In & Fix Payout Pipeline

## Investigation Findings

### Payout Pipeline Broken — Root Causes

1. **`credit-user-wallet` references wrong table and column**: The function queries `user_wallets` table (line 34-38) but the actual table is `wallets`. It also uses `idia_usd_balance` (line 49, 55) but the column was renamed to `idia_beta_balance`. This means every wallet credit fails silently.

2. **No new staged_data since March 27**: The last `staged_data` record is from March 27. Raw health data IS being ingested (most recent: April 9) and marked as `processed: true`, but the `anonymization-processor` edge function (called by idia-synapse) is failing or not creating `staged_data` rows.

3. **JWS signature errors in idia-synapse**: The function receives orchestration calls but encounters `JWSError JWSInvalidSignature` and `CompactDecodeError` when making Supabase client calls. This suggests the `SUPABASE_SERVICE_ROLE_KEY` secret may be corrupted or the function is somehow receiving a malformed auth header.

4. **health-data-bridge calls idia-synapse incorrectly**: The bridge invokes idia-synapse via `supabase.functions.invoke()` which passes the caller's auth context, but idia-synapse rejects non-orchestration calls with 400.

### Wallets table is empty — no wallet rows exist for any user.

---

## Changes

### 1. Add Google Sign-In to Auth Page (`src/pages/Auth.tsx`)
- Add a `handleGoogleSignIn` function using `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Add a Google sign-in button below the Apple sign-in button with the Google "G" SVG icon
- Note: Google OAuth must be configured in the Supabase dashboard under Authentication > Providers

### 2. Fix `credit-user-wallet` Edge Function
- Change table