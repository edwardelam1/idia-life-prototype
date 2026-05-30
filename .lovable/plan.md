# Root cause: RLS on `committee_applications` blocks reviewers

You're right — the UI gate is fine. The block is at the database layer.

## Evidence

`pg_policy` on `public.committee_applications` has exactly three policies:

| cmd | name | qual |
|---|---|---|
| INSERT | Sovereigns can insert committee applications via ACA | — |
| **SELECT** | Sovereigns can read their own committee applications | `auth.uid() = user_id` |
| UPDATE | Users can update their own committee applications | `auth.uid() = user_id` |

The **only** SELECT policy restricts rows to the applicant. There is **no** policy that lets L2 (`oversight_chair`) or L3 (`tophat`) holders read other users' pending applications. So when your tophat session calls:

```ts
supabase.from("committee_applications").select(...).eq("status","pending")
```

PostgREST silently returns `[]` for any row whose `user_id != auth.uid()`. The applicant (`f60af0ab…`) is not you, so the row is filtered out before it ever reaches the React component. The L2 gate in `ApplicationReviewQueue.tsx` then sees an empty array and renders the "No Pending Applications" empty state — exactly what you're seeing.

This also means `ascension-reject` / `ascension-approve` are fine (they run with service role), but the *review surface itself* is structurally invisible to reviewers.

## Fix

Add a SELECT policy that grants reviewers read access. Use the existing `public.has_hat(_user_id, _hat_type)` SECURITY DEFINER helper (already in the schema) so we don't recurse into `dao_hats` RLS.

```sql
CREATE POLICY "Oversight and tophat can read committee applications"
ON public.committee_applications
FOR SELECT
TO authenticated
USING (
  public.has_hat(auth.uid(), 'oversight_chair')
  OR public.has_hat(auth.uid(), 'tophat')
);
```

Multiple permissive SELECT policies are OR'd, so applicants still see their own rows via the existing policy, and L2/L3 reviewers additionally see everyone's. No grant changes needed — `authenticated` already has SELECT on this table.

## Out of scope
- No UI change. `ApplicationReviewQueue.tsx`, the L2 gate, and the Delaware portal layout stay as-is.
- No change to `committee_application_sponsorships`, `ascension-approve`, or `ascension-reject`.
- Not touching INSERT/UPDATE policies.

## Verification after migration
1. Reload Delaware portal → "Application Review Queue · L3" should list the `legal_defense` application from `f60af0ab…` submitted 2026-05-30.
2. Endorse / Approve / Reject buttons should function unchanged (those paths already worked; they were just unreachable).

## Deliverable
One migration adding the SELECT policy above. No code edits, no edge function edits.
