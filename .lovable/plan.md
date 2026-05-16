# Plan

## 1. Wallet — hide Fiat (USD) column
`src/components/enhanced/EnhancedWalletDashboard.tsx` (Total Balance card, lines ~384–397)
- Change `grid-cols-3` → `grid-cols-2`, remove the Fiat (USD) cell, keep Stable USDC and IDIA Token, drop the `border-x` divider styling.
- Same edit in `src/components/WalletDashboard.tsx` (Your Balances card) for parity.

## 2. Wire notification preferences to real behavior

Today the toggles only write to `user_preferences`; nothing reads them. Wire each one:

- **Header Alerts (`in_app_alerts`)** — `src/components/NotificationBell.tsx`: read preference via `useProfile`; when `false`, suppress the unread badge and disable the popover toast feed.
- **UI Sound Effects (`in_app_sounds`)** — `src/lib/notify.ts`: add a small `playChime()` helper gated on `in_app_sounds`. Call it from the existing notify entry points (transaction, alert). Use a single bundled WebAudio beep — no asset download.
- **Enable Push (`push_notifications`)** — new hook `src/hooks/usePushNotifications.ts`:
  - On enable: call `@capacitor/push-notifications` `requestPermissions` + `register` (web fallback: `Notification.requestPermission`).
  - Persist FCM/APNs token to a new `push_tokens` table (user_id, token, platform).
  - On disable: unregister + delete token row.
- **Activity & Goals (`push_activity`)** — used server-side as a filter; client only needs to surface the toggle (already does). Add note in the description ("controls reminder pushes").
- **AI Insights (`push_insights`)** — hidden behind `IDIA_PAY_RELEASE_DATE` gate (see §3).

Add `@capacitor/push-notifications` to `package.json`.

## 3. Hide AI Insights, Product Updates, Monthly Reports until 2026-07-11

`src/components/settings/NotificationSettings.tsx`:
- Import the shared release-date constant (extract `IDIA_PAY_RELEASE_DATE` from `MainApp.tsx` into `src/config/release.ts` and import in both places).
- Compute `isPayReady = new Date() >= IDIA_PAY_RELEASE_DATE`.
- Conditionally render the **AI Insights** row, **Product Updates** row, **Monthly Reports** row only when `isPayReady`.

## 4. Focus Mode — live + history with labeled profiles

New table `public.focus_modes` (migration):
- columns: `id`, `user_id`, `label`, `quiet_hours_start`, `quiet_hours_end`, `is_active`, `created_at`, `updated_at`
- RLS: owner-only (`user_id = auth.uid()`) for select/insert/update/delete
- Partial unique index: only one `is_active = true` per user

`src/components/settings/NotificationSettings.tsx` Focus Mode section:
- When master Focus toggle is on, render:
  - Dropdown of saved profiles (`Default`, plus user-created), with Activate / Edit / Delete
  - Inline "New profile" form (label + start + end → insert row, mark active)
- Activating a profile mirrors its `quiet_hours_*` into `user_preferences` so existing consumers still work, and flips `is_active` atomically (deactivate others first).

New hook `src/hooks/useFocusModes.ts` wraps fetch/create/activate/delete.

## 5. Email Comms — security alerts wired

`src/components/settings/PrivacySettings.tsx`/auth flows already cover password reset via Supabase's built-in recovery email. Add:

- New edge function `supabase/functions/send-security-alert/index.ts` — payload `{ user_id, event: 'new_login' | 'password_changed' }`, looks up email from `auth.users` (service role), sends via the existing `auth-email-hook` infra (or `RESEND_API_KEY` if already configured — confirm via secrets).
- Client triggers:
  - `src/pages/Auth.tsx` (or wherever `signInWithPassword` resolves): on successful sign-in invoke `send-security-alert` with `event: 'new_login'`.
  - `EnhancedProfileSettings` / password-change flow: on successful `updateUser({ password })`, invoke with `event: 'password_changed'`.
- The Security Alerts toggle stays locked/on (compliance), but now actually fires.

## 6. Out of scope / no changes
- No changes to wallet polling (already 1h).
- No backend cron or new triggers beyond focus_modes table + push_tokens table.

## Technical notes

- Migration combined: create `focus_modes`, `push_tokens`, plus RLS policies.
- `IDIA_PAY_RELEASE_DATE` extraction is a pure refactor; update import in `MainApp.tsx`.
- For the push permission UX, surface a toast if the user denies OS-level permission and revert the switch.
- Email: if no `RESEND_API_KEY` secret exists yet, prompt to add it before deploying `send-security-alert`.

