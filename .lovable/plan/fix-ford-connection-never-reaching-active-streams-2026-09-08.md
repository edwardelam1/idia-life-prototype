# Fix Ford connection never reaching Active Streams

## What the evidence shows

Two things are confirmed, not guessed:

1. **The Ford login succeeds, but the token swap fails.** The most recent Ford callback log (2026-09-08 01:46 UTC) reads:
   `Failed to exchange code for token: {"status":404,"detail":"No static resource v1/auth/token","instance":"/fcon-public/v1/auth/token"}`
   Ford returns the user's authorization code, and the callback then calls a token URL that Ford answers with 404. Nothing is stored, so the connection stays inactive.
   Note: the currently deployed callback is calling a different token URL than the one in this project's source (`dah2vb2cprod.b2clogin.com/.../oauth2/v2.0/token`), so the deployed copy has drifted.

2. **Both Ford rows in the database are placeholder rows.** `data_connections` holds two `ford` rows (created 2026-09-06 and 2026-09-07), both `is_active = false`, both with no access token and no sync timestamp. These are the seed rows the app writes before sending the user to Ford. Nothing ever came back to fill them.

Because the row never flips to active, the modal's watcher never fires and the card never moves into Active Streams. Even if the token were stored, no vehicle data would arrive: nothing calls the vehicle-data function after a successful link.

## What to change (all server-side, in the Ford functions)

### 1. Token exchange
Redeploy the callback so it uses the documented FordConnect token endpoint, and make it resilient:
- Attempt the primary endpoint (`dah2vb2cprod.b2clogin.com/914d88b1-3523-4bf6-9be4-1b96b4f6f919/oauth2/v2.0/token?p=B2C_1A_signup_signin_common`).
- On a 404/400, retry once against the alternate FordConnect host used by the current deployment, so a Ford-side endpoint move cannot silently break the link again.
- Log the exact status, endpoint tried, and response body for each attempt with `[BEGIN: Ford.TokenExchange]` / `[END: Ford.TokenExchange]` tags.
- On total failure, return an HTML page that plainly tells the user the link failed and why, instead of a bare 500 string.

### 2. Activate the connection correctly
Keep the existing select-then-update-or-insert flow (no upsert). On success set the tokens, `is_active = true`, `last_sync_at`, and expiry — this is the flip the app is watching for.

### 3. Actually pull vehicle data
Right after storing the tokens, the callback invokes `ford-vehicle-data` for that user so the first telemetry batch lands immediately rather than waiting for an unrelated trigger. Failures there are logged and do not undo the successful link.

### 4. Return the user to the app
The success page currently just calls `window.close()`. Since the app navigates the whole window to Ford, there is no window to close and the user is left stranded on Ford's page. The success page will redirect back into the app (native scheme first, then the web app URL) so the Data tab reloads and shows Ford under Active Streams.

### 5. Housekeeping
- Pin `verify_jwt = false` for `ford-oauth-callback` and `ford-auth-url` in the function config so Ford's browser redirect can always reach the callback.
- Clean up the two dead placeholder Ford rows so a stale inactive row cannot confuse the UI.

## Verification

After deploy, you do one real Ford sign-in from your device. I will then read the function logs for the `[Ford.TokenExchange]` chain and query `data_connections` plus the raw telemetry table to confirm the row went active and vehicle rows landed. No simulated calls from my side.

## Out of scope

No changes to `AppleHealthModal.tsx`, the Apple Health function, or any other data source.
