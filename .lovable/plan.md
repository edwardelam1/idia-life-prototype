## Goal
Force every user (new + existing) on their next login to (1) accept the new Terms of Service v2 and (2) record an Authority of Record decision (accepted or declined). No user may reach the app shell without both attestations on file for the current versions.

## Version bump
Set the required versions as constants (single source of truth):
- `REQUIRED_TOS_VERSION = "v2"`
- `REQUIRED_AOR_VERSION = "v1"` (unchanged)

Because the required ToS version is now `v2`, every existing user (whose `user_metadata.tos_version` is `v1` or missing) will be forced through the ToS screen again on next login. Their prior v1 acceptance stays on the ledger for audit history — we do not delete it.

## Gate logic (single enforcement point)

Rewrite the auth/consent gate in `src/pages/Index.tsx` so that after a session is confirmed, the user is redirected based on this precedence:

```text
if !user                         -> stay (landing)
else if tos_version !== "v2"     -> /terms
else if !aor_decision            -> /authority-of-record
else                             -> MainApp
```

Apply the same check inside `src/App.tsx` route guards so a user can't bypass by typing `/dashboard`, `/settings`, `/secure-vault`, etc. Wrap all authenticated routes with a small `ConsentGate` component that reads `user.user_metadata` and redirects to `/terms` or `/authority-of-record` when either attestation is missing/outdated.

`/terms` and `/authority-of-record` remain reachable while signed in (so the gate can send users there). `/auth` still redirects home when a session exists — that home route then re-runs the gate and pushes them to `/terms`.

## ToS screen changes (`src/pages/TermsOfService.tsx`)
- Change `tos_version` written to metadata + `document_version` in `consent_registry` + `consent_type` in `user_aca_records` from `"v1"`/`"TOS_ACCEPTANCE_V1"`/`"TOS_V1"` to `"v2"`/`"TOS_ACCEPTANCE_V2"`/`"TOS_V2"`.
- Source `sourceId` for ACA becomes `"TERMS_OF_SERVICE_V2"`.
- On success, keep redirect to `/authority-of-record`.
- Add a short banner at the top when `user_metadata.tos_version === "v1"` saying "Our Terms have been updated. Please review and re-accept to continue."

## AoR screen (`src/pages/AuthorityOfRecord.tsx`)
No content change. Ensure that after either decision (accepted or declined) we still write `aor_decision` + `aor_version` to metadata and the `consent_registry` row — this already happens; verify only.

## No database migration required
`consent_registry` already supports multiple versions per user (rows are append-only). We rely on `auth.users.user_metadata` fields (`tos_version`, `aor_decision`, `aor_version`) as the fast runtime check, and the registry as the immutable ledger.

## Files to edit
- `src/pages/Index.tsx` — new precedence gate using `REQUIRED_TOS_VERSION`.
- `src/App.tsx` — wrap authenticated routes with `ConsentGate` (or reuse the same check inline) so `/dashboard`, `/settings`, `/secure-vault`, `/settings/ledger`, `/recovery-phrase` all enforce the gate.
- `src/pages/TermsOfService.tsx` — bump version strings to `v2` and add the "updated terms" banner.
- (new) `src/config/consent.ts` — export `REQUIRED_TOS_VERSION` and `REQUIRED_AOR_VERSION` constants used by the gate and the ToS screen.

## Verification
- Existing user with `tos_version: "v1"` + `aor_decision: "accepted"` → forced to `/terms` on next login, then `/authority-of-record` (re-decision required since ToS version changed? — **decision needed**, see below), then app.
- New signup → `/terms` → `/authority-of-record` → app.
- Signed-in user manually navigating to `/dashboard` without either attestation → redirected out.

## Open question
When a user re-accepts ToS v2, should they also be forced to re-affirm AoR (fresh decision on v1) even if they already had one on file under ToS v1? Two options:
- **A (default in this plan):** Only force AoR if `aor_decision` is missing. Prior AoR decisions carry forward across ToS versions.
- **B:** Treat a ToS bump as invalidating the prior AoR — clear `aor_decision` in metadata during ToS v2 acceptance so every user re-decides.

I'll go with **A** unless you say otherwise.
