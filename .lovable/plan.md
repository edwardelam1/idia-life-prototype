# IDIA Protocol Security Deep Dive — Report and Remediation Plan

Scope: the live app (web + iOS/Android shells), the Crazy Friend / Crazy 8 security protocol, and the backend platform. Read-only audit done 2026-10-24: source code, live database permissions, platform linter, and stored scan results. Nothing was attacked or changed.

## Verdict

The design intent (zero-PII database, consent hashes, strict per-user access) is strong and most user tables are correctly locked to their owner. The real risks are in a handful of backend entry points that trust whoever calls them, two money/token functions any visitor can call, a leaked master key in old setup files, and "biometric" checks that pass automatically when no phone hardware is present.

## Critical (fix first)

1. **Master backend key written into old setup files.** Full admin credential appears in early migration files. If still valid, anyone with the code bypasses every access rule. Action: rotate the key in the platform, then update every place that uses it.
2. **Anyone (even signed out) can increase community pool balances.** `increment_pool_balance` is callable publicly and adds any amount to any pool's recorded balance. Confirmed live.
3. **Any signed-in user can mint governance tokens for any user.** `increment_wallet_balance` is callable by every signed-in user and adds any amount to any wallet's `governance_tokens`. Confirmed live. Directly affects voting power.

## High

4. **Data-source endpoints accept a user ID from the request without checking who is calling** (sign-in check is switched off at the gateway and not done in code):
   - `ford-vehicle-data`, `ingest-strava-data` (also uses a literal placeholder as its verify token), `google-fit-sync`, `apple-health-sync`.
   - Effect: someone can trigger pulls or write data into another person's account.
   - Health functions are under the NEVER TOUCH HEALTH rule — they are listed for awareness and will only be changed with your explicit OK.
5. **`validate-proposal`** lets any signed-in user mark any proposal as validated (no author/role check).
6. **`generate-virtuous-cycle-impacts`** reads everyone's staged data for any signed-in caller.
7. **Wallet recovery words saved unprotected** in app preferences (web: browser storage) under a key named "ENCRYPTED_MNEMONIC", alongside the secure-storage copy. Any script running in the page could steal wallets.
8. **Biometric gates fail open.** The 30-minute re-entry shield passes automatically on web and after 12s of silence; consent hashes on web are "WEB_SIMULATION" and are a plain hash, not a signed hardware proof. Fine for preview, but the backend must refuse simulated consent for anything that moves money or votes.

## Crazy Friend / Crazy 8 Protocol

- What it is: 8 AI personas (anomaly, prediction, threat hunting, orchestration, access, data protection, adversarial, explainer) that analyze security events via OpenAI and log results. It is a monitoring/advisory layer — it does not block or remediate anything on its own.
- Database trigger sends pseudonymous events to `Crazy-Friend-AI` (a separate endpoint; not present in this codebase) and a maintenance pulse calls `crazy-8-security`.
- Gaps: any signed-in user can invoke `crazy-8-security` and `security-event-generator` (no security-operator role), so people can flood the event log and run up AI costs; event data leaves to OpenAI, so payloads should be minimized; raw errors are returned to callers.

## Platform (backend) native controls

- Good: every public table has row-level security on; tokens, password-reset tokens, internal secrets, health metrics, HRI scores, ledgers and wallets are owner-only or fully denied (verified live). The master-key lookup function and salt function are not callable by users. Transport is HTTPS/TLS.
- Many "error" items in the stored scan are stale — live checks show those tables are now locked. A fresh scan should be run to clear them.
- Still open from the linter:
  - 29 admin-privilege functions callable while signed out, 41 callable by any signed-in user (items 2–3 are the worst; the rest need review).
  - 16 views that run with creator privileges (can bypass per-user rules).
  - 6 functions without a pinned lookup path.
  - 46 tables locked with no rules (safe, but confirm intent).
  - Realtime: any signed-in user can subscribe to any channel.
  - Security events/remediation plans readable by all signed-in users; DAO treasury flows expose user IDs; one hardcoded account ID can read all consent records.
  - Leaked-password protection off; database version has security patches pending.

## Medium

- `text-to-speech` is open to anyone and spends the ElevenLabs key — add sign-in and length limits.
- `reset-password` open and returns raw errors (email spam risk, no takeover).
- Wallet vault check treats an outage as "no wallet" and may create a second identity.
- Local Connection nicknames stored unencrypted in the browser database.
- Seed backup file: good encryption, but should cap the iteration count read from the file and protect the visible metadata.
- All open functions allow any website origin (CORS `*`); several leak raw error text.
- `stablecoin-rails` configured but source missing.

## Proposed fix order (on approval)

1. Rotate master key (you do this in the platform settings; I'll guide and update secrets references).
2. Database migration: revoke public/signed-in execute on `increment_pool_balance`, `increment_wallet_balance` and the other money/token/admin functions; pin lookup paths; switch the 16 views to caller privileges; tighten security-event, DAO-flow and consent-record rules; restrict Realtime channels to the owner.
3. Edge functions: derive the user from the sign-in token (or require the server key for scheduled sweeps) in Ford, Strava, `validate-proposal` (author/role check), `generate-virtuous-cycle-impacts`, `text-to-speech`, `crazy-8-security`/`security-event-generator` (operator role); hide raw errors. Health functions only with your explicit OK.
4. Wallet: remove the unprotected recovery-word copy, keep only secure storage; make vault check fail closed on outage.
5. Backend refuses `WEB_SIMULATION` consent for payouts, votes and transfers.
6. Turn on leaked-password protection, schedule the database upgrade, re-run the security scan.

## Technical details

- Live checks: `pg_policies` on sensitive tables, RLS enabled on all public tables (none disabled), `has_function_privilege` for anon/authenticated on SECURITY DEFINER functions.
- Leaked JWT: `supabase/migrations/20250704014621-...sql:9`, `20250713120204-...sql:27,66,111`.
- Unauthenticated service-role handlers: `ford-vehicle-data/index.ts:67-85`, `ingest-strava-data/index.ts:20-81` (literal token at :39), `google-fit-sync/index.ts:28-70`, `apple-health-sync/index.ts:180-266`; 17 of 18 configured functions have `verify_jwt = false`.
- Mnemonic: `src/services/walletService.ts:248-270`. Shield: `SessionLockShield.tsx:28-32,61-67`. ACA sim: `acaGenerator.ts:118-146`.
- Crazy 8 auth: `crazy-8-security/index.ts:89-138`; trigger: migration `20260603142148_...sql:170-194,519-537`.
