# IDIA Protocol — Guarded Silent Vault Architecture

Transition new accounts to silent on-device vault creation, protect legacy/existing identities with a Keychain + Supabase dual-check, and replace the disruptive Glass Shield/Floor Sensor with a mandatory one-time recovery-phrase backup gate.

## 1. Vault Guard helper (new)

Create `src/lib/vaultGuard.ts` exporting `runVaultGuard(userId)`:

- `[START] Vault Guard` log.
- `[PROCESS] Local check` → `walletService.hasWallet()`.
- `[PROCESS] Remote check` → `supabase.from('profiles').select('wallet_address').eq('user_id', userId).maybeSingle()`.
- Return `{ localExists, remoteExists, remoteAddress, isNewUser }` where `isNewUser = !localExists && !remoteExists`.
- If new user: `[PROCESS] Silent vault create` → `walletService.createWallet()`, then `syncWalletToSupabase(address, userId)` (writes `wallet_address` to `profiles`), `[END] New vault provisioned`.
- Else: `[INFO] Vault Guard: Identity detected in ${localExists ? 'Keychain' : 'Supabase Profile'}. Preserving identity.` and `[END] Existing identity preserved` (no wallet generation).
- Return `{ isNewUser, address }` so the caller can route.

`syncWalletToSupabase` does an `update profiles set wallet_address = $1 where user_id = $2 and wallet_address is null` (defensive — never overwrites a legacy address) and dispatches the existing `vault-linked` event.

## 2. Auth.tsx — post-auth lifecycle

Replace the redirect inside `onAuthStateChange` (and after manual login/signup/OTP-reset success) with:

```
const session = ...
if (session && !isResetMode) {
  const { isNewUser } = await runVaultGuard(session.user.id);
  navigate(isNewUser ? '/recovery-phrase' : '/', { replace: true });
}
```

Wrap in try/catch with toast + `[END] Vault Guard failed` log; on failure, still navigate to `/` (never block legacy users). Existing OAuth/email flows remain — guard runs once per auth event.

## 3. New `/recovery-phrase` page

Create `src/pages/RecoveryPhrase.tsx` and add route in `src/App.tsx`:
`<Route path="/recovery-phrase" element={session ? <RecoveryPhrase /> : <Navigate to="/auth" replace />} />`.

Page behavior:
- `[START: Backup Generation]` log.
- `useWallet().getSeedPhrase()` → render 12 words in a numbered 3×4 grid (glass card, monospace, blur-on-tap reveal toggle).
- Show truncated public address.
- **Download Recovery Key** button → builds a `.txt` blob:
  ```
  IDIA Sovereign Vault — Recovery Key
  Address: 0x...
  Created: <ISO>
  Mnemonic: word1 word2 ...
  ```
  Triggers browser download via `URL.createObjectURL` (native: fallback to Capacitor `Filesystem` write to `Documents/`). Sets `downloaded = true`.
- Checkbox: "I have safely backed up my keys" → sets `acknowledged = true`.
- **Complete Setup** disabled until `downloaded || acknowledged`. On click: `[END: Backup Generation]`, navigate to `/onboarding` (existing PII flow).
- No back navigation (mandatory gate).

## 4. MainApp.tsx cleanup

- Delete the Glass Shield `<div>` (lines around the absolute-positioned blur intercept).
- Delete the Floor Sensor `useEffect` that triggers onboarding when `activeTab === 'wallet'`.
- Delete the tab-lock cleanup `useEffect` for `showOnboarding`.
- Remove `OnboardingModal` import and the trailing `{showOnboarding && ...}` JSX.
- Remove `showOnboarding`, `hasDismissedOnboarding`, `sovereignOverride` state and the shift-click override wrapper.
- Keep the audit `useEffect` (still useful for the `vault-linked` hydration and downstream UI).

## 5. ProfileSettings.tsx — Vault Security section

Append a new section above the submit button:

```
Vault Security
─ View/Download Recovery Phrase  [button]
```

Click handler:
- Prompt local biometric/signature via existing `SovereignAuth` pattern (or a simple confirm modal if biometric unavailable).
- On success: navigate to `/recovery-phrase?mode=view` — the page reads the `mode` param and hides the "Complete Setup" gate, showing only the phrase + download button + a "Done" button that returns to `/settings`.
- `[START] / [END] Recovery Phrase Reveal` logs.

## 6. Logging standard

Every bridge action in vaultGuard, RecoveryPhrase, and the Auth post-auth handler emits `[START]`, `[PROCESS]`, `[END]` (and `[ERROR]` on catch) with the action name. No silent awaits.

## Files touched

- **new** `src/lib/vaultGuard.ts`
- **new** `src/pages/RecoveryPhrase.tsx`
- **edit** `src/pages/Auth.tsx` (post-auth guard in `onAuthStateChange`, login, signup, OTP reset success)
- **edit** `src/App.tsx` (add `/recovery-phrase` route)
- **edit** `src/components/MainApp.tsx` (remove Glass Shield, Floor Sensor, OnboardingModal usage)
- **edit** `src/components/settings/ProfileSettings.tsx` (Vault Security section)

No DB migration needed — `profiles.wallet_address` already exists.
