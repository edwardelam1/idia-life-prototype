

# Create AuthSelection Onboarding Component

## Overview
Create a new `src/components/onboarding/AuthSelection.tsx` component that provides three sign-in options: Apple, Google, and Email. This replaces the inline `OAuthOnboarding` sub-component in OnboardingFlow with a more polished, separated version.

## Changes

### 1. Install `@capgo/capacitor-social-login`
This package is referenced in your code but not currently installed. It needs to be added as a dependency for native Apple/Google sign-in to work on mobile devices.

### 2. Create `src/components/onboarding/AuthSelection.tsx`
A new component with:
- **ShieldCheck icon** header with "Identity Mobilization" title and subtitle
- **"Continue with Apple" button** -- white background, black text, calls `SocialLogin.login({ provider: 'apple' })`
- **"Continue with Google" button** -- dark background, white text, calls `SocialLogin.login({ provider: 'google' })`
- **Divider** with "Or" text
- **"Continue with Email" button** -- outline style with Mail icon, calls `onManualSelection` callback
- Loading spinner (`Loader2`) shown on Apple/Google buttons while authenticating
- On successful OAuth, extracts `givenName`, `familyName`, `email` from result and calls `onOAuthSuccess` with a profile data object (including `kyc_tier: 1`, `is_verified: true`)

**Props:**
- `onOAuthSuccess: (profileData) => void` -- called after successful Apple/Google login
- `onManualSelection: () => void` -- called when user taps "Continue with Email"

### 3. Update `src/components/OnboardingFlow.tsx`
- Add a new step `'auth-select'` as the first step (before `'oauth'`)
- Import `AuthSelection` from `./onboarding/AuthSelection`
- When `onOAuthSuccess` is called, capture the data and advance to `'confirm'` step
- When `onManualSelection` is called, advance to `'oauth'` step (existing Supabase OAuth flow as fallback for web)
- Update the progress indicator dots to include the new step

### Technical Notes
- `@capgo/capacitor-social-login` will only work on native iOS/Android builds. On web preview, it will throw an error -- the catch block handles this gracefully
- The existing `OAuthOnboarding` (Supabase OAuth) remains as the fallback for the email/web path
- Uses the app's teal primary and amber accent via semantic tokens (`bg-primary`, `text-primary`, etc.)
- Apple button uses explicit `bg-white text-black` and Google button uses `bg-slate-900 text-white` per platform brand guidelines (these are brand-specific, not theme colors)

