# Add Strava as a data source on the Data screen

## What you'll see

A Strava circle appears on the Data screen next to Apple Health and FordConnect, using the Strava mark. Tapping it opens a small modal that looks and behaves exactly like the FordConnect one: a one-line summary, the data categories Strava provides, a privacy line, and Cancel / Connect buttons.

Connect sends the person to Strava's own sign-in page. When they approve, they land back in the app, the modal flips to a short "Strava Linked!" confirmation and closes itself, and Strava shows up under Active Streams with the live green ring.

## Two things I need from you

1. **The Strava logo image.** Strava's mark is trademarked, so I can't generate it. Upload the PNG/SVG you want used and I'll store it beside the Ford logo.
2. **Strava API credentials.** The project currently has no Strava client ID or secret saved. After you approve, I'll open the secure form to collect `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from your Strava API application page. In that same Strava application, the Authorization Callback Domain must be set to your Supabase functions domain.

## The work

**Modal rewrite — `src/components/StravaConnectionModal.tsx`**

The existing modal is the old oversized style with a popup window, hardcoded dollar figures, and a generic key icon. It gets rebuilt from the FordConnect modal as the template:

- `max-w-sm` dialog, Strava mark in the header, compact spacing, same section rhythm.
- Data categories shown as a 2-column grid: Activities & Workouts, Route & Distance, Pace & Heart Rate, Elevation & Effort.
- Same biometric consent step Ford uses (ACA hash generated and recorded before the hand-off), so Strava follows the same consent protocol as every other source.
- Connected state: Strava active card with Close / Revoke, revoke marking the connection inactive rather than deleting it.
- Connect uses the system browser hand-off Ford uses (Capacitor Browser on Android, full-page navigation on the custom iOS shell and web) — no popup window, which is what breaks today.

**Guaranteed close after a successful token**

Same proven recovery net as Ford: on connect the modal arms a Realtime subscription on the person's `data_connections` rows plus a polling fallback. The moment the Strava row reads active, the modal shows the success state, refreshes the Data screen, and closes after 2 seconds. Timers are cleared on unmount so nothing lingers.

**Callback — `supabase/functions/strava-oauth-callback/index.ts`**

Today it returns an HTML "you can close this window" page, which strands the person on a dead page in the app. It gets changed to redirect to `idialife://strava-callback?status=…` exactly like Ford, so the app is brought back to the foreground. Replace the `upsert` with the select-then-insert/update flow used everywhere else in this codebase. Failures redirect back with a reason instead of printing a server error.

**Auth URL — `supabase/functions/strava-controller/index.ts`**

Kept as the single entry point (the modal already calls it). Add proper validation and a clear error when the client ID is missing, so a missing secret reports plainly instead of producing a broken Strava URL.

**Data screen — `src/components/DataDashboard.tsx`**

Add `hasStrava` alongside `hasFord`, render the Strava circle in Available Data Sources when not connected, include `strava` in the visible-connections filter and in the Active Streams icon map and click handler, and extend the "all sources connected" condition to cover all three.

**App deep link — `src/App.tsx`**

Add a `strava-callback` branch to the existing `appUrlOpen` listener beside the Ford one, so returning from Strava lands on the Data screen.

## Notes

- `ingest-strava-data` and `strava-webhook-subscription` are untouched; once the connection stores real tokens they work as written.
- `strava-auth-url` is a duplicate of the controller's auth-url branch and stays unused; I'd leave it alone unless you want it removed.
- No change to Apple Health, Health Connect, or Ford behaviour.
