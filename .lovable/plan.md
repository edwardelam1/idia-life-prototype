## Add 18+ Age Verification Gate (Pre-ToS Onboarding)

Insert a new age verification screen as the **first onboarding step**, immediately before Terms of Service. DOB stays on-device (Secure Enclave / localPIIVault) — zero PII in Supabase. Only a boolean `age_verified` + timestamp is persisted to `auth.users.user_metadata` so the gate remembers cleared users without ever storing the raw birthdate.

### Flow

```text
Sign in / Sign up
      ↓
/age-verification  ← NEW, blocks everything until cleared
      ↓
/terms (ToS v2)
      ↓
/authority-of-record (AoR v1)
      ↓
App
```

### Files

**New: `src/pages/AgeVerification.tsx`**
- Native `<input type="date">` → summons iOS wheel picker inside the WKWebView shell automatically.
- Compute 18-year cutoff on mount, apply as `max` attribute (physical UI lock against selecting a minor year).
- On submit: re-validate cutoff in JS, store `dob` in `localPIIVault` (Secure Enclave via existing wrapper), update `auth.users.user_metadata` with `{ age_verified: true, age_verified_at: <ISO>, age_verification_version: "v1" }` — **no raw DOB in Supabase**.
- Granular `[BEGIN]/[END]` console logging with the `🛡️ [DOB_LOG]` prefix as specified.
- Rejection screen for minors with a clear message; no retry loop (block the session).
- Glassmorphism / Trust-Blue styling using existing tokens (not the raw Tailwind dark palette from the snippet).

**New: `src/config/consent.ts`** — extend
- Add `REQUIRED_AGE_VERIFICATION_VERSION = "v1"`.

**Edit: `src/components/ConsentGate.tsx`**
- Add first check: if `user.user_metadata.age_verification_version !== "v1"` (or `age_verified !== true`), redirect to `/age-verification`.
- This check runs **before** the ToS check, so age gate always wins.

**Edit: `src/App.tsx`**
- Register `/age-verification` route (public, not wrapped in ConsentGate itself to avoid a redirect loop).

**Edit: `src/pages/Index.tsx`**
- Add the same age check ahead of the ToS/AoR checks so entering `/` also routes correctly.

**Edit: `src/pages/TermsOfService.tsx`**
- Guard at top: if user hits `/terms` without `age_verified`, redirect to `/age-verification`. (Belt-and-braces — ConsentGate already covers this, but this route can be reached directly.)

### Native handoff (frontend side only)

Per your instruction, **no Swift changes**. However, so the existing Swift failsafe you already wrote can validate DOB on every health sync, `src/services/healthService.ts` / `useNativeHealth.ts` will read the DOB from `localPIIVault` and include `dob` (ISO date) in the payload sent to `window.webkit.messageHandlers.syncHealthData`. If DOB is absent locally (edge case: user cleared vault), sync will refuse to fire and route back to `/age-verification`.

### Existing users

Because `age_verification_version` is absent on their metadata, ConsentGate will redirect every existing user to `/age-verification` on their next authenticated request — same enforcement pattern already used for ToS v2 and AoR v1.

### Out of scope

- No Supabase migrations, no new tables, no DOB column anywhere.
- No changes to Swift, Kotlin, or Capacitor plugin code.
- No changes to AoR or ToS content — only ordering and the new pre-gate.
