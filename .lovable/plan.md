## Revised goal (intake-only)

The Account Management section in `EnhancedProfileSettings.tsx` becomes a three-state panel. **No business is ever created and no Org Admin is ever assigned from IDIA Life** — that happens in the Hub app after KYB.

### State machine

1. **Already a member of one or more businesses** (Hub provisioned them)
   - List each membership: **Business Name** + **Platform Role** badge (Org Admin / Team Lead / Team Member) + **Leave Business** button.
   - Leave is disabled when the user is the last active Org Admin of that business, with a tooltip: *"You are the last Org Admin. Closing the business is not allowed from IDIA Life."*
   - Leave calls the existing `revoke_employee(_employee_id)` RPC, which also enforces this rule server-side via `LAST_ORG_ADMIN_DELETE_ORG`.

2. **Has an open intake request** (most recent `account_conversion_requests` for this user with status in `pending` / `in_review`)
   - Show a compact status panel: company name, role applied for, "Application submitted — awaiting KYB review."
   - No Apply button. No Withdraw in this scope.

3. **No memberships and no open request**
   - Show a small **Apply for a Business Account** button.
   - Click opens the existing intake Dialog (Legal Business Name, Industry, Your Full Name, Your Role: Controlling Partner / Authorized Signatory, plus the existing legal-doc file input which we keep visible but do not upload — the Hub team requests documents during KYB; we just record the intake row).
   - Submit inserts one row into `public.account_conversion_requests` with `user_id = auth.uid()`, `status = 'pending'`. After insert, the panel transitions to state 2.

## Database changes

One migration only — the table already exists; it just needs user-scoped RLS so the intake insert and "is there a pending request?" read both work for the signed-in user.

```sql
ALTER TABLE public.account_conversion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit their own conversion requests"
  ON public.account_conversion_requests;
CREATE POLICY "Users can submit their own conversion requests"
  ON public.account_conversion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own conversion requests"
  ON public.account_conversion_requests;
CREATE POLICY "Users can view their own conversion requests"
  ON public.account_conversion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

No new tables. No new functions. No writes to `businesses`, `business_users`, or `employees` from this app. The previously-proposed `create_business_with_founder` RPC is **dropped from the plan**.

## Frontend changes

### `src/hooks/useBusinessMembership.ts` (new)

- Loads, in parallel for the current user:
  - Active `employees` rows joined with `businesses(name)` filtered by `user_id = auth.uid()` and `status = 'active'`.
  - Most recent `account_conversion_requests` row for this user; treats it as "pending" when its status is in `{pending, in_review, received, review}`.
- For each Org-Admin membership, runs a count query for *other* active Org Admins of that same business and exposes `isLastOrgAdmin` per row.
- Exposes:
  - `memberships`, `pendingRequest`, `loading`
  - `refresh()`
  - `submitIntake({ companyName, industry, contactName, contactRole })` → inserts into `account_conversion_requests`.
  - `leaveBusiness(employeeId)` → calls `supabase.rpc('revoke_employee', { _employee_id: employeeId })`; translates `LAST_ORG_ADMIN_DELETE_ORG` into a friendly error.

### `src/components/enhanced/EnhancedProfileSettings.tsx`

- Strip out the existing inline upgrade Dialog state/handlers that wrote to `account_conversion_requests` directly.
- Replace the Account Management `Card` body with a small subcomponent that consumes `useBusinessMembership()` and renders the three states above.
- Keep all other cards (Profile, Verification & Trust, Wallet, Interests) untouched.
- Reuse existing primitives only: `Card`, `Button`, `Badge`, `Dialog`, `Input`, `Select`, `Tooltip`. Maintain the dense minimalist styling from the prior change (`py-2 px-3` headers, `text-sm` titles, `divide-y` for the membership list).

## Verification after apply

- Personal user with no memberships and no prior request: sees "Apply for a Business Account". Submitting the form inserts one row and the panel switches to "Application submitted — awaiting KYB review."
- User the Hub provisioned as Team Member: sees that business with the **Team Member** badge and an enabled **Leave Business** button. Clicking it calls `revoke_employee` and removes the row.
- Sole Org Admin of a business: sees the **Org Admin** badge and Leave is disabled with the tooltip; the server-side `LAST_ORG_ADMIN_DELETE_ORG` exception is the second line of defense.
