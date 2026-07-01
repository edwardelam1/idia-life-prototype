## Plan: Privacy tweaks + Identity Ledger viewer

### 1. Remove Microphone from Hardware Permissions
- `src/components/settings/PrivacySettings.tsx`: drop the `microphone` row from `HW_ROWS`; remove the unused `Mic` import. Only Device Motion, Camera, and Health Kit remain visible.
- Leave `useHardwarePermission` and the permission plugin unchanged (mic key stays supported at the API level, just not surfaced in UI).

### 2. Fix the Export Identity Ledger data
Current bug: `exportData()` queries a non-existent `acas` table with `user_id`, and only prints two profile fields — so the CSV comes out blank. Rewrite to pull the correct data:
- Query `user_aca_records` filtered by `platform_guid = user.id` (matches existing RLS), ordered by `created_at desc`. Columns exported: `created_at`, `source_id`, `consent_type`, `consent_scope`, `aca_hash_key`, `tx_hash`.
- Profile block pulls from `profiles` (zero-PII columns only: `display_name`, `subscription_tier`, `kyc_status`, `created_at`) — no email/phone/address.
- If zero records, still render headers plus a "No consent records on file." row.

### 3. New in-app Identity Ledger viewer with Back frame
Add a dedicated route so the user can review before downloading:
- New page `src/pages/IdentityLedger.tsx`:
  - Same shell/header as `Settings.tsx` (safe-area padding, container, `ArrowLeft` Back button that calls `navigate('/settings')`, title "Identity Ledger").
  - Fetches the same user-scoped `user_aca_records` rows and profile summary on mount (with loading + empty states).
  - Renders a table (Timestamp · Source · Consent Type · Scope · ACA Hash truncated · Tx) using existing shadcn `Table`.
  - Top-right "Download CSV" button reuses the export logic (extracted into a small helper so PrivacySettings and the page share it).
- Register `/settings/ledger` in `src/App.tsx` (auth-gated like `/settings`).
- In `PrivacySettings.tsx`, change the "Export Identity Ledger" row's button from a direct download to `navigate('/settings/ledger')` labelled "View & Export" — the download lives inside the viewer.

### 4. Shared helper
- New `src/utils/identityLedgerExport.ts` exporting `fetchLedger(userId)` (returns `{ profile, records }`) and `buildLedgerCsv({ profile, records })`. Both the viewer page and any future callers use it; no duplicated SQL.

### Out of scope
- No DB schema/RLS changes (existing `user_aca_records` policies already restrict to the owning `platform_guid`).
- No changes to native permission bridges, ACA generator, or edge functions.
- No PII added to the export — profile block stays zero-PII.

### Technical notes
- `user_aca_records` columns used: `platform_guid`, `aca_hash_key`, `source_id`, `consent_type`, `consent_scope` (text[]), `created_at`, `tx_hash`.
- CSV escaping: wrap every value in quotes and double-escape embedded quotes to handle scope arrays and commas.
- Toast messaging unchanged; filename pattern stays `IDIA_Sovereign_Export_<yyyy-mm-dd>.csv`.
