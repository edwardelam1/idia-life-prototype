# Add Nest as a data source

Nest joins Apple Health, FordConnect and Strava on the Data screen. It follows the Strava pattern exactly for the connection experience, and routes its data through the **lifestyle** tables (not the health tables — nothing in the health pipeline is touched).

## What you'll see

- A Nest circle in "Available Data Sources", using the Nest logo you uploaded.
- Tapping it opens a compact modal matching the other three: a short explanation, four data categories (Thermostat & Climate, Home Occupancy, Device Activity, Energy Patterns), Cancel / "Verify & Connect".
- "Verify & Connect" asks for your biometric consent, records the consent artifact, then hands off to Google's account chooser to pick the home/devices you want to share.
- On return, the modal shows "Nest Linked!" and closes itself; Nest appears under Active Streams with the others.
- Revoke from the same modal marks the connection inactive and records a revoke consent artifact.

## Consent (ACA)

Every touchpoint generates and records an Auditable Consent Artifact, same as Strava:

- `nest_connection_auth` — scopes `DATA_CONNECTION`, `HOME_TELEMETRY`, `OAUTH_AUTHORIZATION`
- `nest_connection_revoke` — scopes `DATA_CONNECTION_REVOKE`, `HOME_TELEMETRY`
- Every ingested batch carries the active connection's ACA hash into `raw_app_data.aca_hash_key` and forward into `staged_lifestyle_data.aca_hash_key`. No batch is written without a resolvable ACA hash — if none exists the ingest fails loudly rather than storing unconsented data.

## Data pipeline (lifestyle, mirrors the health logic)

```text
Nest SDM API
   -> raw_app_data            (pseudo_user_id, raw_source='nest', anonymized_payload, aca_hash_key)
   -> lifestyle_processing_queue  (pending -> processing -> completed/failed, retry_count)
   -> staged_lifestyle_data   (user_id, aca_hash_key, event_type, event_category,
                               data_quality_score, synapse_weight_coefficient,
                               reward_amount, reward_calculated)
```

Same staged→reward flow the health pipeline uses: quality score computed on ingest, reward left uncalculated for the existing settlement path to pick up. Health tables, functions and triggers are untouched.

## Technical detail

New edge functions, modelled on the Strava trio:

- `nest-controller` — `get-auth-url`; builds the SDM PCM consent URL
  `https://nestservices.google.com/partnerconnections/<PROJECT_ID>/auth` with `access_type=offline`, `prompt=consent`, scope `https://www.googleapis.com/auth/sdm.service`, and the same base64 state encoding (user id + sanitized return URL, allow-listed hosts).
- `nest-oauth-callback` — exchanges the code at `https://www.googleapis.com/token`, stores `access_token` / `refresh_token` / `token_expires_at` on `data_connections` (`connection_type = 'nest'`) via strict select-then-insert/update (no upserts), then redirects: `idialife://nest-callback?status=…` on the phone app, back to the originating page on web.
- `nest-sync` — refreshes the token when expired, calls SDM `enterprises/<PROJECT_ID>/devices` and each device's traits, writes `raw_app_data`, enqueues `lifestyle_processing_queue`, promotes to `staged_lifestyle_data`, stamps `last_sync_at` / `last_successful_sync`. Granular begin/end log lines on every stage. No simulated data — an empty SDM response records an empty sync, never fabricated readings.

Client changes:

- `src/components/NestConnectionModal.tsx` — new, cloned from `StravaConnectionModal` (Realtime + 3s poll + `nest:oauth-returned` event + visibilitychange recovery net, timers cleared on unmount, 2s auto-close on confirmation).
- `src/components/DataDashboard.tsx` — `hasNest`, the Available card, the visible-connections filter, the Active Streams icon map and click handler, and the all-sources-connected condition.
- `src/App.tsx` — `nest-callback` branch beside the Ford and Strava ones.
- `src/assets/nest-logo.png.asset.json` — asset pointer for the uploaded logo (third-party mark, so no favicon change).

Secrets to save: `NEST_CLIENT_ID`, `NEST_CLIENT_SECRET`, `NEST_PROJECT_ID` (the Device Access project id), `NEST_REDIRECT_URI` = `https://auth.thebigidia.com/functions/v1/nest-oauth-callback` — which must also be listed as an authorized redirect URI on the Google Cloud OAuth client.

## Open item

Periodic pulls (Nest has no webhook without Pub/Sub) are not scheduled in this pass — `nest-sync` runs on connect and on demand. A scheduled pull or Pub/Sub subscription can follow once the flow is verified on a real device.
