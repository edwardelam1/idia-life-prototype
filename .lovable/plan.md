Plan:

1. Fix the missed success state for the block `48018739` proposal.
   - The proposal exists in `dao_proposals` as `Test proposal for new contract` with `on_chain_block = 48018739`.
   - Its DB status is stale: `status=active`, `lifecycle_phase=active`.
   - `dao_pending_actions` is empty, so Negative Consent never had anything to show.
   - Add a reconciliation path that reads `dao_proposals.on_chain_id` directly from the live Governor and updates stale rows when the contract says `Succeeded`, `Queued`, `Executed`, `Defeated`, `Canceled`, or `Expired`.

2. Make `Pending Actions · Negative Consent` populate from successful proposals.
   - When the live Governor state is `Succeeded` or `Queued`, create or upsert a `dao_pending_actions` row for that proposal.
   - Use the proposal title/description, on-chain proposal id, and a timelock expiry window.
   - Prevent duplicates by checking existing `dao_pending_actions.onchain_proposal_id` before inserting.
   - This fixes why the passed proposal did not appear in Negative Consent.

3. Add a new collapsible archive for successful proposals.
   - New component: `SuccessfulProposalsList`.
   - Placement: below Lifecycle Telemetry and above `Archive · Defeated & Canceled`.
   - Same collapsed-list model as `ArchiveProposalsList`, but do not modify the existing defeated/canceled archive.
   - Label: `Archive · Successful Quorum Reached`.
   - Include proposal states:
     - `Succeeded`
     - `Queued`
     - `Executed`
   - Exclude `Expired`; expired remains defeated/canceled.

4. Apply the “deadline passed cannot be active/live” rule before status display.
   - If deadline has passed and quorum was not successful, force archive/defeated display.
   - If quorum was successful, force successful archive display.
   - No row may display `Active`, `Live Vote`, or `In Deliberation` after the deadline has passed.

5. Verify with the known proposal.
   - Confirm block `48018739` no longer appears as active.
   - Confirm it appears under `Archive · Successful Quorum Reached` as `Consensus Reached` or equivalent successful state.
   - Confirm `Pending Actions · Negative Consent` receives a pending timelock action for it when applicable.