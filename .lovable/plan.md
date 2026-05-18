## Relayer-First Governance Migration Plan

Align the Governance screen with the existing gasless relayer architecture (mirroring `relay-usdc-transfer`). The Lovable frontend becomes a thin Web2 client; all on-chain writes route through a new authenticated edge function that signs with `RELAYER_PRIVATE_KEY` on Base Mainnet. This removes any need for MetaMask/WalletConnect during Apple review.

### Scope

In-scope:
- New edge function: `relay-governance-action`
- Refactor governance UI handlers to call the relayer endpoint (no client-side contract writes, no client-side balance burns)
- DB reconciliation of governance state after on-chain confirmation
- Stage-tagged logging on both client and server for Apple-review traceability

Out of scope:
- Smart contract changes (assumes `approveAndExecute(uint256)` and escrow targets already deployed on Base)
- Quadratic vote burn mechanics on-chain (kept as-is unless explicitly extended)
- Wyoming MSA / Treasury / Committees flows (separate pass)

### Architecture

```text
[Governance UI] --(JWT + {actionType, escrowTarget, proposalId, chainId})-->
[supabase/functions/relay-governance-action]
   ├─ verify JWT via getUser()
   ├─ load RELAYER_PRIVATE_KEY + BASE_RPC_URL
   ├─ resolve escrow target address (team | ecosystem)
   ├─ ethers.Contract(target, ABI, relayerWallet).approveAndExecute(proposalId)
   ├─ await receipt
   └─ INSERT audit row + UPDATE dao_pending_actions.status='processed'
[Base Mainnet] <-- signed tx broadcast
```

### Step 1 — Edge Function: `relay-governance-action`

Path: `supabase/functions/relay-governance-action/index.ts`

Behavior:
- CORS preflight + JSON CORS headers on all responses
- Stages: `PARSE_REQUEST → VERIFY_IDENTITY → CONNECT_BLOCKCHAIN → BROADCAST_TRANSACTION → AWAIT_CONFIRMATION → RECONCILE_DATABASE`
- Each stage emits `[GOV_RELAY][<stage>][START|SUCCESS]` log lines; failure logs `[GOV_RELAY][FAILED] at [<stage>]: <msg>` and returns `{ error, failed_at }`
- Auth: `Bearer` JWT required; resolved via `supabaseAdmin.auth.getUser(token)`; reject anonymous
- Network map (chainId 8453 only for now):
  - `team`: `0xF0E67683783ef5879b43ef99ab04Bc27A9a71074`
  - `ecosystem`: `0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708`
- RPC: `BASE_RPC_URL` env, fallback `https://mainnet.base.org`
- Validates `RELAYER_PRIVATE_KEY` present and wallet ETH balance > 0 (matches `relay-usdc-transfer` pattern)
- After receipt: update `dao_pending_actions` row (`status='processed'`, `tx_hash`, `processed_at`) and insert a `transactions` audit row (`transaction_type='governance_execution'`, metadata with `tx_hash`, `target_contract`, `proposal_id`, `action_type`)

Validation:
- Zod-style guard: `actionType ∈ {APPROVE_AND_EXECUTE}`, `escrowTarget ∈ {team, ecosystem}`, `proposalId` numeric/string-coercible, `chainId === 8453` (others rejected explicitly)

Secrets required (verify via `fetch_secrets`):
- `RELAYER_PRIVATE_KEY` (existing — already used by `relay-usdc-transfer`)
- `BASE_RPC_URL` (existing/optional — fallback exists)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

### Step 2 — Frontend Refactor

Files:
- `src/components/governance/PendingActionsCarousel.tsx` — replace any simulated/local "Execute" handler with a call to the relayer endpoint
- `src/components/governance/ActiveProposalsList.tsx` — keep the existing quadratic vote DB insert (off-chain intent) but route any "execute/approve" action through the relayer; do not add a wallet connector

New shared helper: `src/services/governanceRelay.ts`
```ts
export async function relayGovernanceAction(params: {
  actionType: 'APPROVE_AND_EXECUTE';
  escrowTarget: 'team' | 'ecosystem';
  proposalId: string | number;
  chainId?: number;
}): Promise<{ tx_hash: string; block_number: number; target_contract: string }>
```
- Uses `supabase.auth.getSession()` to attach the user JWT
- POSTs to `${SUPABASE_URL}/functions/v1/relay-governance-action`
- Logs `[GOV_UI][START|SUCCESS|ERROR]` lines mirroring the server stages
- Surfaces toast on success/failure

Touch points:
- Wire the new helper into the existing "Execute"/"Approve" buttons in `PendingActionsCarousel.tsx`
- No removal of the existing `dao_votes` insert path (that remains as off-chain intent capture per prior guidance that ACA does not mint)

### Step 3 — Apple-Review Compliance Posture

- No browser extension, WalletConnect, or external wallet prompt anywhere in the governance flow
- All blockchain interactions are server-mediated; tester sees only native loading + toast
- Stage-tagged logs allow live debugging of any RPC stall during App Review

### Verification

1. `supabase--deploy_edge_functions` for `relay-governance-action`
2. `supabase--curl_edge_functions` with a stub `proposalId` against an unauthorized header → expect 401-style error at `VERIFY_IDENTITY`
3. Authenticated curl with `chainId: 1` → expect rejection at `PARSE_REQUEST`
4. Authenticated curl with valid Base proposal → expect `tx_hash` + `block_number`
5. Tail logs via `supabase--edge_function_logs` to confirm all six stages emit

### Open Questions

1. **Vote casting on-chain:** Should the quadratic "SYNC INTENT" button in `ActiveProposalsList` also route through the relayer (on-chain `castVote`), or remain a DB-only intent (current behavior)? Default in this plan: keep DB-only.
2. **`dao_pending_actions` schema:** Confirm columns `status`, `tx_hash`, `processed_at`, `proposal_id` exist; if not, a small migration is needed before deploy.
3. **Authorization tier:** Should `APPROVE_AND_EXECUTE` require a specific DAO hat (e.g., `security_council` / `tophat`) via `has_hat()`? Recommended: yes — add a hat check after `VERIFY_IDENTITY`.
