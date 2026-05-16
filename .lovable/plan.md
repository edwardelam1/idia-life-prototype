# Delaware Registry — Revoke Request & Remove Membership

The "Delaware Registry · Level 1 Ascension" panel (`src/components/governance/CommitteesList.tsx`) currently lets a user **Apply to Join** a committee, which then shows a disabled **Pending Audit** chip. Two states are missing:

1. While the application is `pending`, the user has no way to withdraw it.
2. Once the application is approved and the matching hat in `dao_hats` is granted, the user has no way to step down.

This plan adds both, fully ACA-anchored on native devices and consistent with the existing glossy/teal aesthetic.

## UX changes (CommitteesList.tsx)

For each committee card, derive one of four states from live ledger data:

```text
not_applied   → [ Apply to Join ]            (existing)
pending       → [ Pending Audit ] [ Revoke Request ]   (NEW second button)
active_member → [ Active Officer ] [ Remove Membership ]   (NEW row)
revoked       → [ Apply to Join ]            (re-enabled, same as not_applied)
```

- **Revoke Request** — outline button, orange tint, `RotateCcw` icon. Opens a small confirm dialog ("Withdraw your pending application to {committee}. Your ACA bond will be released.") with an ACA handshake on confirm.
- **Remove Membership** — outline button, red tint, `LogOut` icon. Opens a confirm dialog warning that the user's officer hat will be revoked and they will lose committee voting rights. Requires ACA handshake.
- Both gated on `isNative()`, matching the existing Apply flow.
- Pending chip + Revoke button render side-by-side on desktop, stacked on mobile (`flex-col sm:flex-row gap-2`).

## Data model

No schema changes to `committee_applications` columns themselves — `status` already exists as text. We add:

- Two new allowed status values: `withdrawn`, `revoked` (text, no enum). Filtering in `fetchLedgerState` changes from "any row" to `status IN ('pending','approved')` so withdrawn/revoked rows free the user to re-apply.
- **RLS policy additions** on `public.committee_applications` to let a user `UPDATE` their own row (currently insert-only is assumed). Policy: `auth.uid() = user_id`.
- **RLS policy additions** on `public.dao_hats` to let a user `UPDATE` their own hat row to set `revoked_at = now()` and `eligibility_status = 'revoked'` (`auth.uid() = user_id`). Approval/grant remains backend-only.

These are the only DB changes; no new tables.

## Client logic

In `CommitteesList.tsx`:

- Extend `fetchLedgerState` to also pull the current user's active hats: `dao_hats` where `user_id = me`, `eligibility_status = 'active'`, `revoked_at IS NULL`. Store as `Set<hat_type>` in `userActiveHats`.
- Extend `userApplications` to a `Record<committee_id, applicationId>` so we can target the row on revoke.
- Add `handleRevokeRequest(committeeId)`:
  - ACA hash with action `committee_revoke_request_{id}`, tags `["DELAWARE_MSA_WITHDRAWAL","LEDGER_WRITE"]`.
  - `UPDATE committee_applications SET status='withdrawn', aca_hash_key=…, aca_payload=… WHERE id = applicationId AND user_id = me AND status='pending'`.
  - Toast + refresh.
- Add `handleRemoveMembership(committeeId)`:
  - ACA hash with action `committee_resign_{id}`, tags `["DELAWARE_MSA_RESIGNATION","HAT_REVOCATION"]`.
  - `UPDATE dao_hats SET revoked_at=now(), eligibility_status='revoked' WHERE user_id = me AND hat_type = committeeId AND revoked_at IS NULL`.
  - Toast + refresh; the existing realtime channel on `dao_hats` (via `CommitteesList` re-fetch) updates Active Officer count.

## Files touched

- `src/components/governance/CommitteesList.tsx` — UI states, two new handlers, two new confirm dialogs.
- One Supabase migration — RLS update policies for `committee_applications` and `dao_hats` scoped to `auth.uid() = user_id`.

No other components change. No new tables, no new edge functions.
