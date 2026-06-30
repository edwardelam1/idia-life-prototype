# Account Reconciliation — Edward's Legal Defense Hat

## Background

Edward has two accounts in the system:

| Account | Email | Provider | Last sign-in |
|---|---|---|---|
| `f60af0ab…` | edwardelam90@gmail.com | email/password | 2026-05-30 (stale) |
| `143ab69a…` | edwardisawesome1017@outlook.com | **Apple** | 2026-06-30 (current) |

The active `legal_defense` hat is currently attached to `f60af0ab…`, but he signs in with Apple ID, which lands on `143ab69a…`. That's why his app shows "not a committee member" and prompts him to join.

## Plan

Re-point Edward's records from the stale email account (`f60af0ab…`) to his Apple ID account (`143ab69a…`):

1. **Move the active legal_defense hat** — update `dao_hats` row `deb182d4-da57-4dd1-8ad1-59068add6471` so `user_id = 143ab69a…`.
2. **Move the revoked legal_defense hat** (`8f01c116…`) the same way, so his history stays intact on the live account.
3. **Move his committee application** — update the one `committee_applications` row owned by `f60af0ab…` to `143ab69a…`.
4. **Leave the stale auth user in place** — do not delete `f60af0ab…` or its profile row; just orphan it. (You can purge it later from the Supabase dashboard if you want.)

No code changes. No schema changes. Pure data update via the insert tool.

## Verification

After the update, on Edward's device (signed in via Apple):
- Governance → Committees should show **Legal Defense** as active.
- Roster should be viewable; no "join" prompt.
- His committee application history should appear under his account.

## Out of scope

- The `217c6224…` (edward.elam@gmail.com, also Apple) account has its own full set of hats (tophat, legal_defense, security_council, etc.). I'm not touching it — confirm whether that's a separate person or yet another duplicate before any further consolidation.
- `eddie.elam@gmail.com` (`ed3b0c2d…`) has never signed in and holds no hats — ignoring.
