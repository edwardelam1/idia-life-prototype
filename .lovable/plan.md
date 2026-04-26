# Sovereign Vault Purge & UI Scrub

## What changes for the user

The wallet onboarding will read as a 100% non‑custodial bridge. Users **Link** an existing wallet (MetaMask, Coinbase Wallet, WalletConnect, etc. via RainbowKit) instead of "Initializing" anything. All "Provisioning" language is replaced with "Syncing Vault…", and the "Self-Custody" pillar is rebranded to "Vault Assets".

## Audit findings (good news)

A full search of `src/` shows the project is already mostly clean:

- **No source file imports** `@coinbase/waas-sdk-web`, `@coinbase/waas-sdk-react-native`, or `@circle-fin/w3s-pw-web-sdk`.
- **No `Enclave` / `Handshake` / `Provisioning` SDK sequences exist** — the only remaining matches are unrelated PII copy ("secure enclave" as a concept) and one local `isProvisioningFBO` loading flag.
- **`wagmi` + RainbowKit are already wired** (`src/App.tsx`, `SecureVault.tsx`, `OnboardingModal.tsx`, `EnhancedWalletDashboard.tsx`).
- **No app code reads `circle_wallet_address` / `circle_wallet_id`** — those columns only appear in the auto‑generated `src/integrations/supabase/types.ts`. App code already uses `profile.wallet_address` everywhere.

So the work is small and surgical.

## Changes

### 1. `package.json`
Remove the unused dependency:
- `@circle-fin/w3s-pw-web-sdk`

### 2. `src/components/ui/OnboardingModal.tsx`
- Rename `isProvisioningFBO` → `isSyncingFBO`.
- FBO loading copy: show **"Syncing Vault…"** while pending.
- Wallet button copy:
  - Connected: **"Sovereign Vault Linked"**
  - Disconnected: **"Link Sovereign Vault"** (was "Link Private Vault")
  - Sub-label: **"Self‑custody via MetaMask, Coinbase Wallet, WalletConnect…"**
- Explicitly import and use `useAccount` from `wagmi` at the top of the component to derive `isConnected` (in addition to RainbowKit's render‑prop), so the modal's connection state is driven by wagmi as the request requires.
- Header copy stays "Sovereign Vault" (already correct).

### 3. `src/components/enhanced/EnhancedWalletDashboard.tsx`
- Three‑pillar balance card: rename the middle pillar label **"Self‑Custody"** → **"Vault Assets"**.
- Security tab button:
  - Connected: **"Manage Sovereign Vault"** (was "Manage External Vault")
  - Disconnected: **"Link Sovereign Vault"** (was "Initialize Secure Vault")
- Footer hint: **"Link a Sovereign Vault to enable liquidation"** (was "External Vault Link Required for Liquidation").
- Continue using `useAccount` from wagmi (already imported) — no new logic needed; `wallet_address` is already the schema field in use.

### 4. `src/components/MainApp.tsx`
No code changes required — already keys off `profile.wallet_address` and `profile.fbo_account_id`. Verified.

## Out of scope / intentionally not touched

- **`src/integrations/supabase/types.ts`** — auto‑generated; the `circle_wallet_*` columns are dormant DB fields with no app references. Renaming the DB column would require a migration and is unrelated to the UI/SDK purge requested. Flagging for a future migration pass if desired.
- **"Secure Enclave" PII copy** in `Onboarding.tsx` and `ProfileSettings.tsx` — refers to the iOS Secure Enclave for PII storage, not a Coinbase/Circle SDK sequence. Leaving as‑is.
- No Node polyfills are added; the existing `Buffer` polyfill in `main.tsx` is unrelated to this purge and stays as it supports RainbowKit/wagmi's WalletConnect transport.

## Technical constraint compliance

- Native Web APIs only — nothing added.
- No new bridge libraries; relies on existing `wagmi` + `@rainbow-me/rainbowkit`.
- After approval, run `bun remove @circle-fin/w3s-pw-web-sdk` and verify `bun run build` succeeds.
