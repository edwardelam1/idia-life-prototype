# Fix the 10-minute DAO tally error and confirm the security-event functions

## 1. DAO tally job (`dao-proposal-tally`), error 22P02

**The real cause (confirmed by reading the code and the database layout):** the proposal lookup is already correct. It reads `dao_proposals.on_chain_id` and falls back to the `id` (UUID) only when there is no on-chain ID. The failure comes from the next step, which counts the votes:

- It filters `dao_votes.proposal_ref`, which is a **UUID** column, using the 77-digit on-chain ID, so Postgres rejects the value.
- The app records each vote in `dao_votes.proposal_id`, a **text** column, as the on-chain ID when the proposal has one and as the UUID otherwise. That is the same key the tally builds.

**Change:** in `supabase/functions/dao-proposal-tally/index.ts`, filter votes with `.eq("proposal_id", proposalRef)` instead of `.eq("proposal_ref", proposalRef)`. Then redeploy the function. Nothing else in the function, the schedule or the database changes.

**Verification:**
- Run the function once by hand and confirm the logs show no "votes fetch failed" line for proposal `29d799bb-…`.
- After the next 10-minute run, check the logs again to confirm the error is gone.

**Side effect to expect:** until now, the failing vote count meant this proposal was always skipped. Once the count works, if its end date has passed, the next run will close it as passed or failed, based on its recorded votes and quorum. That is the intended behavior.

## 2. `resolve_security_event` and `get_security_event_detail`

Verified live, and no change is needed:
- Both are SECURITY DEFINER.
- Both have `search_path=public` pinned.
- Signed-in users can execute them; signed-out visitors cannot.
