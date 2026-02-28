

# Revert Wallet to Light Theme + Create Onboarding Flow

## 1. Remove Dark Theme from Wallet Components

Revert all three wallet-related files from the dark slate/indigo theme back to standard light theme colors that follow the app's design system (using Tailwind semantic classes like `bg-background`, `text-foreground`, `bg-card`, `border`, etc.).

### Files to update:

**`src/components/WalletDashboard.tsx`**
- Replace `bg-slate-950`, `bg-slate-900`, `bg-slate-800` backgrounds with `bg-background`, `bg-card`, `bg-muted`
- Replace `text-white`, `text-slate-200`, `text-slate-400`, `text-slate-500` with `text-foreground`, `text-muted-foreground`
- Replace `border-slate-700`, `border-slate-800` with `border` (standard border)
- Update gradient card to use light-friendly gradient (e.g., `from-primary/5 to-primary/10`)
- Update button colors from `bg-indigo-600` to `bg-primary`
- Keep the structure (Bio-Sovereign header, three-pillar balance, quick actions, activity ledger) -- just restyle to light theme

**`src/components/enhanced/EnhancedWalletDashboard.tsx`**
- Same color reversion as above across all four tabs (Overview, Transactions, Credit, Security)
- TabsList and TabsTrigger: remove dark overrides, use default shadcn styling
- Cards, badges, buttons: revert to standard light theme classes
- Keep all functionality intact (tax export, NFC, send/request, trust score simulation)

**`src/components/AddFundsModal.tsx`**
- DialogContent: remove `bg-slate-950 border-slate-800 text-white`, use defaults
- Input: remove `bg-slate-900 border-slate-800 text-white`, use defaults
- Payment info card: light background instead of dark slate
- Button: `bg-primary` instead of `bg-indigo-600`
- Text colors: use semantic classes

## 2. Create Onboarding Flow Component

Create a new `src/components/OnboardingFlow.tsx` that implements a multi-step onboarding experience. Since `framer-motion` is not installed, animations will use CSS transitions/Tailwind animations instead.

### Steps in the flow:
1. **OAuth** -- Apple/Google sign-in buttons with identity mobilization branding. Uses Supabase OAuth (existing pattern from Auth.tsx) instead of `@capgo/capacitor-social-login` which isn't installed.
2. **KYC Auto-Confirmation** -- Shows the captured user profile data (name, email, provider) with a confirm button.
3. **Bio-Key Minting** -- Animated fingerprint icon with status progression (initializing -> syncing -> minted). Uses CSS keyframes for the pulsing rings animation.
4. **Privacy/Data Sovereignty** -- Embeds the existing `PrivacySettings` component with a "Enter IDIA Life" button.

### Sub-components (all inside OnboardingFlow.tsx):
- `OAuthOnboarding` -- Sign-in screen with Apple/Google buttons
- `KYCAutoConfirmation` -- Profile review and confirm
- `BioKeyMinting` -- Animated minting sequence with pulsing rings
- Progress indicator dots at the bottom

### Integration:
- The component accepts an `onComplete` callback prop
- Uses Supabase auth (not `@capgo/capacitor-social-login` or `fetchApi`)
- Uses the existing `PrivacySettings` component from `src/components/settings/PrivacySettings.tsx`
- Includes the `FriendAssistant` overlay with trigger="onboarding" (requires adding 'onboarding' to the trigger type)
- Animations use Tailwind `animate-` classes and CSS transitions instead of framer-motion

### Type update:
- **`src/components/FriendAssistant/types.ts`** -- Add `'onboarding'` to the trigger union type

### Note:
The onboarding flow will be created as a standalone component. Integration into the app routing (e.g., showing it after first sign-up) can be done as a follow-up step.

