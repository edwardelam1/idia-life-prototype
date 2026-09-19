# Pending consent requests: move into History, real biometrics, real approval

## What you'll see

- The "Pending Actions" block disappears from the Wallet overview. Pending data-monetization requests appear inside the History list, mixed in by date with everything else, marked as awaiting your consent and showing the pending amount. Tapping one opens the same consent sheet.
- Tapping "Authorize" on a phone triggers Face ID / Touch ID, exactly like connecting Apple Health, Ford, Strava or Nest. If you cancel or it fails, nothing is signed.
- Once approved, the request is really recorded: it leaves the pending state, the row in History flips to a signed receipt, and the list shrinks immediately.

## What is actually broken (verified)

- The consent sheet never asks for a biometric. It builds a hash itself in the browser instead of going through the shared consent generator that every other consent screen uses — so the Secure Enclave is never called on iOS, and nothing at all happens on Android.
- The approval service is a stub. Its live logs show only "Verifying token from terminal: undefined" then "Yielding volatile payload" — it never writes anything. The database confirms it: today's 8 requests are still `pending_consent` with no consent hash, even though the app showed "Consent cryptographically signed."
- Because the service returns success, the app shows a success toast and then re-reads the same still-pending rows, so the list never shrinks.
- The Android shell has no biometric channel at all (only health and NFC plugins exist), so Android needs a native addition before biometrics can fire there.

## Technical changes

**History integration (`src/components/enhanced/EnhancedWalletDashboard.tsx`)**
- Remove the Pending Actions block from the Overview tab.
- Map each `lidd_extraction_events` row with `payment_status = 'pending_consent'` into the same shape the History list already uses (`id`, `created_at`, description "Data Monetization Request", source `USDC`, amount `0.75`), flagged `pending: true`.
- Merge them into the same sorted array as transactions and synapse entries; the zero-amount and hidden-description filters must not drop them.
- In the History row renderer, pending rows keep the amber accent, "Requires consent" badge, and open `SovereignConsentModal`; non-pending rows keep today's receipt behaviour.

**Biometric consent (`SovereignConsentModal` in the same file)**
- Replace the inline `crypto.subtle.digest` block with `generateACAHash(userId, "lidd_consent_authorize", ["DATA_MONETIZATION", "ALPR_INGESTION"])` from `src/utils/acaGenerator.ts`, then `recordACA(...)` from `src/utils/acaLedger.ts` — the same order Strava and Ford use.
- A rejected or timed-out biometric aborts before any call to the backend; no success toast, no state change.

**Approval service (`supabase/functions/verify-idia-life-tap`)**
- Add the function to this repo (it currently exists only as a deployed stub with no source here) and rewrite it: validate the caller's JWT, load the event, verify it belongs to the caller and is still `pending_consent`, write `aca_hash_key`, set the status to consented, and return the updated row. Explicit BEGIN/END logs for each step; a failed update returns an error rather than a success payload.
- Client treats a non-updated response as a failure and shows the reason.

**Android biometrics**
- `generateACAHash` currently only probes the iOS WKWebView bridge. Add an Android branch that calls a `IDIABiometric` Capacitor plugin and an Android plugin (`android/app/src/main/java/com/idia/life/plugins/biometric`) using `androidx.biometric` BiometricPrompt, resolving success/failure on the same event channel as iOS. Requires `npx cap sync` and a rebuild of the Android app.

## Out of scope

Apple Health pipeline, other data sources, settlement/payout maths.

## Verification

Live on a device: a pending request shows in History (not Overview); tapping Authorize raises Face ID; cancelling signs nothing; approving writes the consent hash, flips the row's status in the database, and removes it from the pending set on the next refresh.
