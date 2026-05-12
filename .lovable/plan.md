## Plan

1. **Fix the database default causing the constraint failure**
   - Change `profiles.account_type` default from invalid `personal` to valid `individual`.
   - Keep the existing allowed values intact: `individual`, `organization`, `enterprise_staff`, `system_admin`, `god_guid`.
   - This addresses the exact PostgREST failure where an insert/upsert omitted `account_type`, causing Postgres to apply the invalid default and violate `profiles_account_type_check`.

2. **Harden frontend profile updates used after Trust Score calculation**
   - Update the profile mutation helpers so fallback inserts/upserts include the required safe defaults: `id`, `user_id`, `platform_guid`, `account_type: "individual"`, `ai_assistant_name: "Friend"`, and `kyc_tier: 1`.
   - Prevent Trust Score completion from relying on a partial profile insert containing only `trust_score`, `available_credit_line`, `updated_at`, and `user_id`.

3. **Preserve the Trust Score flow**
   - Leave the psychometric scoring and Trust Score Edge Function call behavior unchanged.
   - Only change persistence behavior so successful calculations can be saved reliably.

4. **Verify**
   - Re-check the `profiles` constraint/default after the migration.
   - Run a targeted code check/search to confirm no Trust Score profile write path still inserts a partial row without `account_type`.