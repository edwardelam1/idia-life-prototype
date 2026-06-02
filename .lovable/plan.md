# Plan: Granular Telemetry for `relay-governance-action` Silent Stall (v2)

## Goal
Pinpoint exactly where the function hangs by instrumenting every async boundary from request receipt through the first blockchain RPC round-trip, with hard timeouts so the worker can never silently hang to `EarlyDrop`.

## Scope
Single file: `supabase/functions/relay-governance-action/index.ts`. Pure observability + defensive timeout wrappers. No business-logic changes.

## Helper: shared timeout race
Add a tiny helper near the top of the file so every suspect await uses the same pattern:
```ts
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}
```

## Changes

### 1. Granular body parsing (STAGE: PARSE_REQUEST)
Replace `const body = await req.json().catch(() => ({}));` with:
```ts
console.log(
  `[GOV_RELAY][PARSE_REQUEST][HEADERS] method=${req.method} content-type=${req.headers.get("content-type")} content-length=${req.headers.get("content-length")}`,
);
console.log("[GOV_RELAY][PARSE_REQUEST][AWAIT_JSON_START] Awaiting req.json()");
let body: any;
try {
  body = await withTimeout(req.json(), 10_000, "req.json()");
  console.log("[GOV_RELAY][PARSE_REQUEST][AWAIT_JSON_END] Successfully parsed body");
} catch (e: any) {
  console.error("[GOV_RELAY][PARSE_REQUEST][JSON_ERROR]", e?.message || e);
  return jsonResponse({ error: "Invalid JSON body", failed_at: "PARSE_REQUEST" }, 400);
}
```

### 2. Granular auth round-trip (STAGE: VERIFY_IDENTITY)
The existing `supabaseAdmin.auth.getClaims(token)` is another silent-hang candidate. Wrap and log:
```ts
console.log("[GOV_RELAY][VERIFY_IDENTITY][AWAIT_CLAIMS_START]");
const { data: claimsData, error: claimsError } = await withTimeout(
  supabaseAdmin.auth.getClaims(token),
  8_000,
  "auth.getClaims()",
);
console.log(`[GOV_RELAY][VERIFY_IDENTITY][AWAIT_CLAIMS_END] error=${!!claimsError}`);
```

### 3. Granular RPC provider + first read (STAGE: CONNECT_BLOCKCHAIN)
Currently the provider is built and `provider.getBalance()` is awaited with zero per-step telemetry. Replace the `CONNECT_BLOCKCHAIN` block with explicit boundaries:
```ts
console.log("[GOV_RELAY][RPC_SETUP][START] Resolving RPC URL");
const networkConfig = NETWORKS[networkId]!;
const rpcUrl = Deno.env.get("ALCHEMY_BASE_RPC_URL") || networkConfig.rpcUrlFallback;
console.log(`[GOV_RELAY][RPC_SETUP][URL] using=${rpcUrl.includes("alchemy") ? "alchemy" : "public-base"}`);

const relayerKey = Deno.env.get("RELAYER_PRIVATE_KEY");
if (!relayerKey) {
  return jsonResponse({ error: "RELAYER_PRIVATE_KEY unbound.", failed_at: stage }, 500);
}

console.log("[GOV_RELAY][RPC_SETUP][PROVIDER_INIT_START]");
const provider = new ethers.JsonRpcProvider(rpcUrl);
console.log("[GOV_RELAY][RPC_SETUP][PROVIDER_INIT_END]");

console.log("[GOV_RELAY][RPC_SETUP][WALLET_BIND_START]");
const relayerWallet = new ethers.Wallet(relayerKey, provider);
console.log(`[GOV_RELAY][RPC_SETUP][WALLET_BIND_END] address=${relayerWallet.address}`);

console.log("[GOV_RELAY][RPC_SETUP][GET_BALANCE_START]");
const gasBalance = await withTimeout(
  provider.getBalance(relayerWallet.address),
  8_000,
  "provider.getBalance()",
);
console.log(`[GOV_RELAY][RPC_SETUP][GET_BALANCE_END] balance=${ethers.formatEther(gasBalance)} ETH`);
if (gasBalance === 0n) {
  return jsonResponse({ error: "Relayer wallet has no gas funds.", failed_at: stage }, 500);
}
```

### 4. Granular first contract read for CANCEL_PROPOSAL
The `Promise.all([govRead.state(...), govRead.proposalProposer(...)])` is the first real on-chain call in that branch. Wrap with telemetry + timeout:
```ts
console.log(`[GOV_RELAY][CONTRACT_READ][START] state(${onchainId}) + proposalProposer(${onchainId})`);
const [s, p] = await withTimeout(
  Promise.all([govRead.state(onchainId), govRead.proposalProposer(onchainId)]),
  10_000,
  "governor.state+proposer",
);
console.log(`[GOV_RELAY][CONTRACT_READ][END] state=${Number(s)} proposer=${p}`);
```

### 5. Granular broadcast boundaries (all three branches)
Both `castVote()`, `cancel()`, and `approveAndExecute()` already log "Tx submitted" after the await returns — but never log the moment they enter the await. Add a `[BROADCAST_TRANSACTION][AWAIT_SUBMIT_START]` line immediately before each contract call, mirroring the existing `[Tx submitted]` line. Keep the existing post-submit and `tx.wait()` logs as-is — no timeout on `tx.wait()` (legitimate Base block times can exceed 8s).

## Out of Scope
- No changes to other relay functions (`relay-delegation`, `relay-usdc-transfer`). Once we identify the stall, mirror the pattern.
- No client-side changes to `governanceRelay.ts`.
- No retry/backoff logic — just observability + fail-fast timeouts.

## Verification
1. Deploy.
2. Trigger the failing governance action.
3. Inspect edge logs — the last successful `[*_END]` log identifies the exact suspect. Expected diagnostic outcomes:
   - Stops after `[PARSE_REQUEST][HEADERS]` with no `[AWAIT_JSON_END]` → body stream stall (likely caller-side).
   - `[JSON_ERROR] req.json() timed out after 10000ms` → confirmed body hang, fix caller.
   - Stops after `[AWAIT_CLAIMS_START]` → Supabase auth round-trip hang.
   - Stops after `[PROVIDER_INIT_END]` with no `[GET_BALANCE_END]` → RPC endpoint (Alchemy or public Base) unreachable from edge runtime.
   - `[GET_BALANCE_END]` reached but `[CONTRACT_READ][END]` never → governor read reverting/hanging.
