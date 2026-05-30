## Refactor `src/services/governanceService.ts` for speed + DB-backed reads

Single-file change: `src/services/governanceService.ts`. Confirmed prerequisites:
- `public.governance_proposals` table exists with all needed columns (`proposal_id`, `proposer`, `description`, `state`, `state_name`, `for_votes`, `against_votes`, `abstain_votes`, `vote_start`, `vote_end`, `targets`, `callvalues`, `calldatas`, `network`, `block_created`).
- `governance-indexer` edge function is deployed and reachable.

### Step 1 — Supabase import + cached provider
- Add `import { supabase } from '../integrations/supabase/client';` to imports.
- Replace stateless `getProvider()` with a memoized version backed by a private `_provider` field, constructing `new ethers.JsonRpcProvider(rpcUrl, chainId, { batchMaxCount: 5 })` once.

### Step 2 — Concurrency helpers (private methods)
- `delay(ms)` — promise-based throttle.
- `triggerIndexer()` — fire-and-forget `supabase.functions.invoke('governance-indexer', { body: {} })`, wrapped in try/catch with `console.warn` on failure.

### Step 3 — Rewrite `getRecentProposals(address)`
Delete the chunked `provider.getLogs` scraper (`MAX_LOG_RANGE = 9999` loop and per-event parsing) and replace with:
- Supabase query against `governance_proposals`, filtered by `network` (`mainnet` vs `testnet` from `ACTIVE_DEPLOYMENT`), ordered by `block_created desc`.
- For each row, sequentially call `gov.hasVoted(proposalId, address)` when `address` is set, throttled with `delay(200)` only when `dbProposals.length > 3`.
- Map DB columns into existing `ProposalOnChain` shape (`row.callvalues` → `values`).
- Keep `callRaw`, `computeQuorumFromSupply`, `getCurrentQuorum`, `getProposalQuorum`, `getGovernorParams`, `getDelegationInfo`, `getProposalState`, and the `GOVERNOR_DEPLOY_BLOCK` constants intact (constants can stay even though unused, or be removed — minor cleanup).

### Step 4 — Wire indexer into write paths
At the end of `propose`, `proposeWithTiming`, and `castVote`, immediately before `return`, call `this.triggerIndexer().catch(() => {});` so the DB resyncs after each mutation. Leave `delegate` and `signAndRelaySelfDelegation` unchanged (delegation doesn't alter proposal state).

No DB migrations, no new edge functions, no other files touched.