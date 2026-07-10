Root causes found:
- `LifecycleTelemetry` only fetches the newest 10 `dao_proposals`, so anything older than the latest 10 rows can disappear from telemetry.
- DB-only motions with no `end_date` remain `draft` forever, so old motions like “Android test motion” and “This motion got motion 2” can still render as “In Deliberation.”
- `ActiveProposalsList` currently filters out every DB row without an `on_chain_id`, which means committee motions never reliably participate in the same bucket/archive classification as proposals.

Plan:
1. Add one shared helper in `ActiveProposalsList.tsx` that treats a motion as closed when:
   - chain deadline has passed, or
   - `end_date` has passed, or
   - it is a DB-only committee motion/draft older than the normal 7-day motion window.
2. Update `classifyProposalBucket` so expired DB-only motions are routed to `DEFEATED`, not active/deliberation.
3. Update `ActiveProposalsList` hydration so DB-only motions are included in `combined`, then filtered by `classifyProposalBucket` before rendering active cards. This prevents expired motions from showing in active while still allowing archive to pick them up.
4. Update `LifecycleTelemetry` to fetch more rows and use the same closed-motion logic so older motions from “Android test motion” downward are present and labeled `Archived` / `Voting Closed · Deadline Passed`, not `In Deliberation`.
5. Keep `ArchiveProposalsList` using the shared classifier so expired motions and failed/cancelled proposals land together under `Archive · Defeated & Canceled`.
6. Validate against the live DB rows for:
   - `Android test motion`
   - `This motion got motion 2`
   - `Test Motion 1`
   - `Motion Test 3`

No database schema change is required.