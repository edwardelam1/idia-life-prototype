# Correct the FordConnect server flow and remove the fallback page

## Confirmed failure

The latest production logs show Ford returning directly to `ford-oauth-callback` with **no authorization code and no state**, three times in succession. The callback then renders the “Returning to IDIA” HTML page; that page was not removed.

The edge functions are using a mismatched Ford flow:

- Current authorization URL: `https://fordconnect.cv.ford.com/common/login`
- Current token endpoints: the older `signup_signin_common` B2C policy plus guessed FordConnect paths
- Current vehicle endpoint: `https://api.mps.ford.com/api/fordconnect/v3`
- Current OAuth state: the full 36-character user UUID

Ford’s current FordConnect Query implementation uses:

- Authorization: `https://api.vehicle.ford.com/fcon-public/v1/auth/init`
- Token exchange: `https://api.vehicle.ford.com/dah2vb2cprod.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_FCON_AUTHORIZE`
- Data API: `https://api.vehicle.ford.com/fcon-query/v1`
- A short 16-character OAuth state

This accounts for the immediate empty callback: the app is entering the wrong authorization flow with a state value Ford does not accept.

## Changes

### 1. Replace the authorization flow

Update `ford-auth-url` to:

- Validate the signed-in caller in the function and derive the user ID from that session, never from a caller-supplied ID.
- Generate a cryptographically random 16-character state.
- Store a short-lived mapping from that state to the user ID.
- Build the URL against Ford’s `/fcon-public/v1/auth/init` endpoint with only `response_type`, `client_id`, `redirect_uri`, and the short `state`.

### 2. Use the matching token contract

Update `ford-oauth-callback` to:

- Require and consume the stored state before exchanging a code, preventing replay or account swapping.
- Exchange the code only against Ford’s matching `B2C_1A_FCON_AUTHORIZE` token endpoint.
- Remove the guessed fallback token URLs so failures are explicit rather than crossing incompatible Ford auth systems.
- Keep activation and the immediate first data pull after a valid token is stored.

### 3. Fully remove the “Returning to IDIA” page

Delete the empty-callback HTML response entirely. A callback without `code` and valid `state` will log the failure and issue an immediate HTTP redirect back to IDIA; it will never render a fallback, retry, or “Returning to IDIA” page.

Successful callbacks will also return by HTTP redirect rather than pausing on an intermediate HTML page.

### 4. Align vehicle retrieval with FordConnect Query

Update `ford-vehicle-data` to use the same FordConnect Query family:

- Refresh through the matching `B2C_1A_FCON_AUTHORIZE` token endpoint.
- Retrieve the authorized garage and telemetry from `api.vehicle.ford.com/fcon-query/v1`.
- Preserve the existing no-mock-data rule and only activate/display Ford after real Ford data is received.

### 5. Secure temporary OAuth state

Add a service-only, expiring OAuth-state table containing only random state, user UUID, and expiry. It receives no browser grants or public policies, and each state is deleted when consumed.

## Verification

- Test the edge functions’ URL construction, state validation, token request, redirects, and failure handling.
- Confirm no callback branch contains or serves the removed fallback page.
- After deployment, perform one real Ford sign-in on the iPhone.
- Read the callback and vehicle-data logs, then confirm the Ford connection becomes active only after real telemetry lands.

## Scope

Only Ford edge functions and the temporary server-side OAuth-state storage change. No Ford modal, app navigation, Apple Health, or other UI changes.
