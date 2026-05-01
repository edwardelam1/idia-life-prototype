## Goal

Replace the static "Upgrade to Business" CTA in the Account Management section of `EnhancedProfileSettings.tsx` with a live, role-aware Business Membership panel:

- **No business**: show a "Create a Business Account" CTA that creates a real `businesses` row and makes the current user the founding **Org Admin** in `employees`.
- **Has one or more businesses**: list each membership with **Business Name**, the user's **Platform Role** (Org Admin / Team Lead / Team Member), and a **Leave Business** action.
- **Leave Business** is disabled when the user is the last active Org Admin, with a tooltip explaining that destroying the business is not allowed from IDIA Life.

## Technical context

- `public.employees` already carries `platform_role` ('Org Admin' | 'Team Lead' | 'Team Member'), `status`, and `business_id` → `public.businesses(id)`. The DB function `revoke_employee(_employee_id uuid)` already enforces the rule "the last active Org Admin cannot be removed" (raises `LAST_ORG_ADMIN_DELETE_ORG`). We will reuse it directly.
- `public.businesses` RLS allows `business_users`-based access; insert is fine for `authenticated` but historically managed via the `business_users` path. We will add a small SECURITY DEFINER RPC `create_business_with_founder(_name text, _entity_type text, _business_type text)` that, in one transaction:
  1. Inserts a `businesses` row owned by `auth.uid()`.
  2. Inserts an `employees` row for `auth.uid()` with `platform_role='Org Admin'`, `status='active'`, `aca_secured=true`, `is_ephemeral=false`, plus a `business_users` row with `role='owner'`, `is_active=true` so existing RLS predicates resolve correctly.
  3. Returns the new `businesses` row.
- This avoids fighting `businesses` RLS from the client and keeps both membership tables consistent.
- Reading memberships from the client: `select id, platform_role, business_id, businesses(name, entity_type) from employees where user_id = auth.uid() and status = 'active'`.

## Database changes (single migration)

1. Create RPC `public.create_business_with_founder(_name text, _entity_type text default 'individual', _business_type text default 'general')` returning the new business id, marked `SECURITY DEFINER`, `SET search_path=public`. Validates `_name` is not empty and `auth.uid()` is not null.
2. Grant `EXECUTE` on this function to `authenticated`.
3. No schema additions, no new tables, no new RLS policies on existing tables. `revoke_employee` is already exposed and already enforces the last-Org-Admin rule.

## Frontend changes

### `src/hooks/useBusinessMembership.ts` (new)

- Fetches `employees` rows for the current user joined with `businesses(name)` filtered by `status='active'`.
- Exposes `memberships`, `loading`, `refresh`, `createBusiness(name, entityType)` calling the new RPC, and `leaveBusiness(employeeId)` calling `supabase.rpc('revoke_employee', { _employee_id })`.
- For each membership, also computes `isLastOrgAdmin` by querying the count of other active Org Admins in that business — drives the disabled state of the Leave button without needing the RPC to fail first.

### `src/components/enhanced/EnhancedProfileSettings.tsx`

Replace the entire body of the existing Account Management `Card`:

1. Remove the personal-vs-business `account_type` branch and the existing "Upgrade to Business Account" Dialog (and its `account_conversion_requests` insert + form state).
2. Use `useBusinessMembership()`.
3. Render rules:
   - **Loading**: a single skeleton row.
   - **No memberships**: small muted helper line + a primary `Button size="sm"` "Create a Business Account" that opens a compact Dialog with one Input (Business Name) and an entity-type Select (Individual / LLC / Corporation / Non-Profit). Submit calls `createBusiness`, toasts success, refreshes.
   - **Has memberships**: a tight list, one row per business, `divide-y` for minimalism:
     - Left: business name (`text-sm font-medium`) and a `Badge` showing the platform role.
     - Right: `Leave` button (`variant="ghost" size="sm"`, destructive text). Disabled when `isLastOrgAdmin === true`, with tooltip "You are the last Org Admin. Closing the business is not allowed from IDIA Life."
     - Below the list, a smaller `+ Create another business` link/button.
4. Keep all other cards untouched.

### Tooltip wrapper

Use the existing `@/components/ui/tooltip` primitives so the disabled-Leave reason is accessible on hover/focus.

## Out of scope

- No edits to the unrelated `account_conversion_requests` table.
- No invitation/accept flow for adding other team members from this screen — that lives elsewhere in the Hub product.
- No business-detail editing here; this panel is membership-only.

## Verification

After implementation:
- A fresh personal user sees "Create a Business Account"; clicking and submitting "Acme LLC" creates a row and the panel re-renders to show "Acme LLC — Org Admin" with Leave disabled.
- A user added as Team Member to another business sees that business with role "Team Member" and an enabled Leave button; clicking Leave revokes via `revoke_employee` and the row disappears.
- A sole Org Admin sees Leave disabled with the tooltip; if they somehow bypass the UI, `revoke_employee` still raises `LAST_ORG_ADMIN_DELETE_ORG` and the toast surfaces it.
