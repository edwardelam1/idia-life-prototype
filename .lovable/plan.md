
# Wallet Dashboard and Add Funds Modal Redesign

## Overview
Redesign the wallet experience with a dark, premium aesthetic featuring a Bio-Sovereign identity header, three-pillar balance display, and a compliance-aware Add Funds modal with Bio-Key authorization flow. All data will be simulated since no database changes are allowed.

## Changes

### 1. Update WalletDashboard (`src/components/WalletDashboard.tsx`)
- Replace the current light-themed layout with a dark slate/indigo premium design
- Add an identity and security header showing "Wallet" title with "Bio-Sovereign Protected" badge and KYC tier indicator
- Redesign balance card as a "Three-Pillar" display showing Total Account Value prominently, with Cash (FBO), IDIA-USD, and IDIA Token sub-balances in a dark gradient card
- Replace quick actions with "Add Funds" and "Send Payment" buttons styled in indigo/slate tones
- Redesign the Recent Activity section as a dark-themed ledger with status indicators (e.g., "Settled"), green for incoming and muted for outgoing amounts
- Keep existing Supabase data fetching but use simulated fallback values when no real data exists
- Remove dependency on non-existent `fetchApi` -- keep using Supabase client

### 2. Update EnhancedWalletDashboard (`src/components/enhanced/EnhancedWalletDashboard.tsx`)
- Apply the same dark premium redesign to the enhanced version (this is the one displayed in the app via MainApp)
- Maintain existing tabs (Overview, Transactions, Credit, Security) but restyle them with the dark theme
- Update the overview tab balance card with the new three-pillar layout and total account value
- Keep existing functionality (tax export, NFC payroll, send/request, trust score simulation)

### 3. Redesign AddFundsModal (`src/components/AddFundsModal.tsx`)
- Replace the current simple card-selection flow with a compliance-aware deposit flow
- Add Bio-Key and KYC status checks: if Bio-Key is not "STABLE" or KYC tier is less than 1, show a security lock message preventing deposits
- Add a USD amount input field with large mono-styled font
- Show "Worldpay Secure" payment gateway info badge with "PCI-DSS Compliant Egress" label
- Replace the submit button with "Authorize with Bio-Key" featuring a fingerprint icon
- Add footer text explaining FBO settlement and IDIA-USD ledger crediting
- Simulate Bio-Key as "STABLE" and KYC as Tier 1 by default so the deposit form is accessible
- Show loading spinner state during simulated processing

### Technical Notes
- No new dependencies required -- all icons (`ShieldCheck`, `Landmark`, `Fingerprint`, `Loader2`, `History`) are available from lucide-react
- No `fetchApi` module will be created -- all data continues to flow through existing Supabase queries with simulated fallbacks
- The `AddFundsModal` interface will gain optional `bioKeyStatus` and `kycTier` props with sensible defaults
- Dark theme uses Tailwind classes (`bg-slate-950`, `bg-slate-900`, `border-slate-800`, `text-slate-300`, etc.) applied at component level, not globally
