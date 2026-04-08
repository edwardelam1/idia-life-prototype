

# Sovereign Onboarding, IDIA-BETA Rebrand & FBO Architecture

## Overview
This plan introduces a device-sovereign onboarding flow where PII never touches Supabase, renames IDIA-USD to IDIA-BETA across the UI, and stubs the FBO pass-through architecture.

## 1. Install Capacitor Secure Storage Plugin
- Run `npm install capacitor-secure-storage-plugin`

## 2. Create Onboarding Page (`src/pages/Onboarding.tsx`)
- Multi-step form: Name, Email, Phone (strict `xxx-xxx-xxxx` mask using regex `^\d{3}-\d{3}-\d{4}$`)
- On submit:
  1. Validate phone format strictly
  2. Store PII locally via `SecureStoragePlugin.set({ key: 'user_pii_profile', ... })` — PII never sent to Supabase
  3. Fetch `platform_guid` from profiles table (or user ID as fallback)
  4. Generate SHA-256 ACA hash of consent payload
  5. Insert ACA record to new `user_aca_records` table (hash only, no PII)
  6. Call stubbed `sendToFBOProvider()` function (placeholder for Airwallex/Currencycloud)
- Route: `/onboarding`, added to `App.tsx`

## 3. Database Migration
- Create `user_aca_records` table:
  ```sql
  CREATE TABLE public.user_aca_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_guid text NOT NULL,
    aca_hash_key text NOT NULL,
    consent_type text DEFAULT 'KYC_CONSENT',
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE public.user_aca_records ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can insert own ACA records" ON public.user_aca_records
    FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Users can view own ACA records" ON public.user_aca_records
    FOR SELECT TO authenticated USING (true);
  ```
- Add `platform_guid` column to profiles if missing (or use `user_id` as the GUID)

## 4. Rename IDIA-USD → IDIA-BETA (UI Only)
Keep database column `idia_usd_balance` unchanged. Update display labels in:
- `src/components/WalletDashboard.tsx` — line 195: "IDIA-USD" → "IDIA-BETA"
- `src/components/enhanced/EnhancedWalletDashboard.tsx` — line 196: "IDIA-USD" → "IDIA-BETA"
- `src/hooks/useWalletBalance.ts` — interface comments (cosmetic)
- `src/hooks/useEnhancedProfile.ts` — interface comments (cosmetic)

## 5. Edge-Hydrated Notifications Utility (`src/utils/notificationHydrator.ts`)
- Helper that reads PII from `SecureStoragePlugin.get({ key: 'user_pii_profile' })` and merges it with anonymous backend notification payloads
- Used by notification listeners to display personalized messages locally without backend PII exposure

## 6. FBO Stub (`src/utils/fboProvider.ts`)
- Exports `sendToFBOProvider(formData, acaHash)` as an async stub that logs and returns success
- Ready to be swapped for real Airwallex/Currencycloud SDK calls later

## 7. Route Guard Update (`src/pages/Index.tsx`)
- After authentication, check if `user_pii_profile` exists in secure storage
- If not, redirect to `/onboarding` before showing `MainApp`

## Technical Details
- `capacitor-secure-storage-plugin` uses iOS Keychain / Android Keystore under the hood
- In web preview mode, it falls back to encrypted localStorage — functional for dev/testing
- The ACA hash is `SHA-256(platformGuid + consentType + timestamp)` providing an auditable consent anchor without storing PII server-side
- No database column rename needed — avoids migration risk while achieving the branding change

## Files Created/Modified
| File | Action |
|------|--------|
| `package.json` | Add `capacitor-secure-storage-plugin` |
| `src/pages/Onboarding.tsx` | **Create** — sovereign onboarding form |
| `src/utils/fboProvider.ts` | **Create** — FBO stub |
| `src/utils/notificationHydrator.ts` | **Create** — edge-hydrated notification helper |
| `src/App.tsx` | Add `/onboarding` route |
| `src/pages/Index.tsx` | Add secure storage check before MainApp |
| `src/components/WalletDashboard.tsx` | Rename label to IDIA-BETA |
| `src/components/enhanced/EnhancedWalletDashboard.tsx` | Rename label to IDIA-BETA |
| Migration SQL | Create `user_aca_records` table with RLS |

