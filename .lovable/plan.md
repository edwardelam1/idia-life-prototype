

# ACA (Auditable Consent Artifact) Hash Implementation

## Summary
Add cryptographic consent anchoring to all data source connection flows. Every "Connect" click produces a SHA-256 hash of the user's consented data types, stored in the database and passed through event tracking. Zero UI changes.

## Changes

### 1. Database Migration — Add columns to `data_connections`
- `aca_signature TEXT` — SHA-256 hash of consented data types
- `consent_metadata JSONB` — stores consent timestamp, source name, data types array, consent version

### 2. New Utility — `src/utils/acaHash.ts`
- `generateAcaHash(consentedTypes)` — deterministic SHA-256 hex string via Web Crypto API (`crypto.subtle.digest`)
- `ACA_CONSENT_VERSION = "1.0.0"` — exported constant

### 3. New Utility — `src/utils/DataBridge.ts`
- Single entry point `connectDataSource(userId, sourceId, dataTypes, metadata)` that:
  - Generates ACA hash
  - Upserts `data_connections` with `aca_signature` and `consent_metadata`
  - Returns `{ data, aca_signature }`
- Acts as the "air gap" — all modals call this instead of upserting directly

### 4. Update `AppleHealthModal.tsx`
- Import `generateAcaHash` and `ACA_CONSENT_VERSION`
- In `syncHealthDataViaNativeApp`: generate hash from `requestedTypesByCategory`, add `aca_hash` to `comprehensiveHealthRequest` sent to iOS native app
- In `handleConnect`: replace direct `data_connections` upsert with `DataBridge.connectDataSource(...)` call, passing selected data type IDs
- Add `aca_hash` and `consent_version` to `eventTracker.trackFeatureUsage` context on `connection_created` and `sync_completed` events

### 5. Update `DataSourceModal.tsx`
- Import `DataBridge.connectDataSource`
- Replace the manual `data_connections` upsert in `handleConnect` with the DataBridge call, passing `source.dataTypes`
- Add `aca_hash` and `consent_version` to `eventTracker.trackFeatureUsage` context

### 6. Update `StravaConnectionModal.tsx`
- Import `generateAcaHash` and `ACA_CONSENT_VERSION`
- Define fixed Strava data types array (`['activities', 'gps_routes', 'heart_rate', 'pace', 'elevation', 'power']`)
- In `handleConnect`: generate hash, include in `eventTracker` context for `connect_initiated`
- In `checkConnection`: after confirming active connection, update the record with `aca_signature` and `consent_metadata` via a Supabase update call

### 7. Safety Valve — `src/integrations/supabase/client.ts`
- Add exported `secureDataPush(tableName, payload)` helper that rejects `data_connections` inserts/upserts missing `aca_signature` with a console error
- Does not replace the existing `supabase` export; optional enforcement layer

### 8. No changes to `EventTracker.ts`
- Existing `trackFeatureUsage` context object already supports arbitrary keys

## Technical Details

- Hash function uses `crypto.subtle.digest('SHA-256', ...)` with sorted JSON keys for determinism
- Consent version `"1.0.0"` is a hardcoded constant, manually bumped when terms change
- `consent_metadata` JSONB shape: `{ timestamp, user_id, source_id, data_types[], consent_version, entry_point }`
- All changes are background-only — no visual or UX modifications

