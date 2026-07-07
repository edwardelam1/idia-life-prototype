## Diagnosis

Your account (`edward.elam@gmail.com`, wallet `0x429F…5A40`) exists in `profiles`, and `IDIA Data Inc.` (id `df9d2157-e202-4623-b811-b094836d5eeb`) exists in `businesses`. But there is no row in the `employees` table linking your `user_id` to that business.

The IDIA Life "Business" screen is driven entirely by `employees` (via `useBusinessMembership`, which selects rows where `user_id = auth.uid()` and `status = 'active'`). With no such row, the UI correctly falls back to "add / apply for a business" — the business record has no owner attached to it here.

This is a data gap, not a code bug. The Hub app normally writes the Org Admin `employees` row after KYB; that step never ran for your account against this Supabase project.

## Fix

Insert one `employees` row so IDIA Data Inc. shows up as yours:

- `user_id`: `217c6224-d839-43b0-98cb-b4d1be267536` (edward.elam@gmail.com)
- `business_id`: `df9d2157-e202-4623-b811-b094836d5eeb` (IDIA Data Inc.)
- `platform_role`: `Org Admin`
- `status`: `active`

After the insert, reload the app — the "add a business" prompt will be replaced by IDIA Data Inc. with Org Admin controls, and `isLastOrgAdmin` will resolve to `true` until another admin is added.

## Out of scope

- No schema changes.
- No code changes to `useBusinessMembership` or the intake flow.
- Not touching the Apple Relay or `wkomp314@gmail.com` accounts. If you also want either of those linked as Org Admin, say so and I'll add them in the same step.
- Not migrating the `IDIA Cafe Chain` seed business.
