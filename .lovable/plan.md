# Plan: Live Quorum Telemetry + On-Chain Proposal Submission

## 1. Dynamic Quorum in `LifecycleTelemetry.tsx`

Currently `quorum = proposal?.quorum_threshold ?? 1000` — a static DB column with a hardcoded `1000` fallback. The real quorum lives on the `IDIAGovernor` contract and changes with token supply / governor params.

**Changes to `src/components/governance/LifecycleTelemetry.tsx` (DetailDialog only):**

- Add a `const [quorum, setQuorum] = useState<number | null>(null)` state.
- Inside the existing tally `useEffect`, after the Supabase fetch, fire `governanceService.getCurrentQuorum()` in parallel and set the result (parsed as `Number`).
- Wrap the call in its own stage tracer: `stage("LIFECYCLE_DETAIL", "QUORUM_FETCH")` with `[START]`, `[SUCCESS]` (value), `[FAIL]`, `[END]` markers.
- Fallback order for display: live on-chain value → `proposal.quorum_threshold` → `"…"` (never the static `1000`).
- Header shows `{totalVotes} / {quorum ?? "…"}`. Progress bar uses `0` when quorum is still loading to avoid divide-by-zero.
- No DB migration; no change to the outer list query.

## 2. On-Chain Proposal Submission in `CreateDaoProposalModal.tsx`

Apply the user-provided patch verbatim:

- Import `governanceService` from `@/services/governanceService`.
- In `handleSubmit`, between `AUTH_SUCCESS` and `DB_INSERT_START`, add the **CHAIN execution block**:
  - Call `governanceService.propose(\`# ${safeTitle}\n\n${safeDescription}\`)`.
  - Capture `hash` and `proposalId`.
  - Wrap in inner try/catch that rethrows a wallet-friendly error message (`chainError.reason || chainError.message`).
  - Log `[PROPOSAL_SUBMIT] CHAIN_START` / `CHAIN_SUCCESS` / `CHAIN_FAIL`.
- DB insert remains unchanged (no new columns written — `on_chain_id` / `tx_hash` stay commented out since the schema does not yet have them).
- Toast text updated to "Proposal live on-chain!".
- `TEMP_DISABLE_AI_VALIDATION` constant left intact (still skips AI validator).

## Out of Scope

- No new DB columns for `tx_hash` / `on_chain_id` (can be a follow-up).
- No changes to `governanceRelay` (correctly bypassed — proposing requires the user's signed tx to prove `proposalThreshold`).
- No changes to vote tally logic (already weight-aware).

## Files Touched

- `src/components/governance/LifecycleTelemetry.tsx`
- `src/components/governance/CreateDaoProposalModal.tsx`
