

# Fix Profile Update + Add Onboarding Data Collection

## Root Cause
The `profiles` table is missing four columns that the settings form tries to write: `phone_number`, `date_of_birth`, `full_legal_address`, and `avatar_url`. Every update attempt fails with `PGRST116` ("0 rows returned") because Supabase rejects the unknown columns.

## Changes

### 1. Database Migration — Add missing columns to `profiles`
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS full_legal_address JSONB,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```
No new RLS policies needed — existing policies already cover SELECT/UPDATE/INSERT for `auth.uid() = user_id`.

### 2. New Component — `src/components/OnboardingScreen.tsx`
A multi-step onboarding screen shown after sign-up (before MainApp) when the user's profile is missing required fields. Steps:

- **Step 1 — Identity**: First name, last name, date of birth (calendar picker MM/DD/YYYY)
- **Step 2 — Contact**: Phone number (US format auto-formatter), email (read-only from auth)
- **Step 3 — Address**: Street 1, street 2, city, state (dropdown), ZIP — with USPS validation
- **Step 4 — Avatar**: Optional profile photo upload

Uses the same validation logic already in `ProfileSettings.tsx` (phone regex, zip regex, USPS check). On completion, upserts all data to the `profiles` table and proceeds to MainApp.

### 3. Update `src/pages/Index.tsx`
After confirming authentication, load the user's profile. If required fields (`first_name`, `last_name`, `date_of_birth`, `phone_number`, `full_legal_address`) are missing/null, render the `OnboardingScreen` instead of `MainApp`. On onboarding completion, transition to `MainApp`.

### 4. Update `src/hooks/useProfile.ts`
- Add a `isProfileComplete` computed boolean that checks all mandatory fields are populated
- Export it alongside existing returns

### 5. Fix `ProfileSettings.tsx` update call
The current `updateProfile` sends an `email` field from the form (which doesn't exist on the table and is read-only). Ensure `email` is excluded from the update payload — it's already excluded in `onSubmit` destructuring but needs verification that no leftover field sneaks in.

## Technical Details
- The `full_legal_address` JSONB column stores `{ street1, street2, city, state, zip }` — same `USAddress` interface already defined in `useProfile.ts`
- `date_of_birth` stored as `DATE` in ISO format (`yyyy-MM-dd`), displayed as `MM/DD/YYYY`
- The `handle_new_user()` trigger already creates a bare profile row on sign-up; onboarding fills in the required fields
- Avatar upload reuses the `avatars` storage bucket created in the previous migration

