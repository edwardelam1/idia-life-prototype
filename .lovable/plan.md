## Gasless `castVoteBySig` Architecture Pivot

Restore the gasless contract for standard voters: the user's local signer produces an EIP-712 `Ballot` signature, the relayer wallet broadcasts `castVoteBySig` and pays the gas. Tophat overrides keep using `castVote` (Treasury weight). Mirrors the existing `signAndRelaySelfDelegation` / `relay-delegation` pattern.

### 1. Frontend — sign the Ballot

`src/services/governanceService.ts` — add `signBallot(proposalId, support)`:

- Pull `signer` via `walletService.getConnectedSigner()`; throw if missing.
- Resolve Governor name via `await new ethers.Contract(PROTOCOL.governor, ["function name() view returns (string)"], provider).name()` (fallback `"IDIAGovernor"`). Version `"1"`.
- `chainId` = `8453` mainnet / `84532` testnet via `ACTIVE_DEPLOYMENT`.
- `verifyingContract` = `PROTOCOL.governor`.
- `types = { Ballot: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }] }`.
- `value = { proposalId: BigInt(proposalId).toString(), support }`.
- `const sig = ethers.Signature.from(await signer.signTypedData(domain, types, value));`
- Return `{ v: sig.v, r: sig.r, s: sig.s, signerAddress: await signer.getAddress() }`.

`src/components/governance/ActiveProposalsList.tsx` (vote handler, lines 427–471):

- After existing weight/balance guards, if `!tophatOverride`:
  - Wrap `governanceService.signBallot(proposal.on_chain_id, chainSupport)` in `stage("GOV_UI","SIGN_BALLOT")`.
  - On user rejection / signer error: toast "Signature cancelled" and abort without relaying.
  - Add `v`, `r`, `s`, `voterAddress` to `relayPayload`.
- Tophat override: do NOT sign; payload unchanged.
- `voteWeight` stays informational only.

### 2. Backend — branch on signature presence + locked-down preflight

`supabase/functions/relay-governance-action/index.ts`:

- Extend `GOVERNOR_ABI`:
  - `"function castVoteBySig(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) returns (uint256)"`
  - `"function getVotes(address account, uint256 blockNumber) view returns (uint256)"`
  - `"function proposalSnapshot(uint256 proposalId) view returns (uint256)"`
  - `"function hasVoted(uint256 proposalId, address account) view returns (bool)"`
- PARSE_REQUEST destructure: add `v`, `r`, `s`, `voterAddress`.
- In CAST_VOTE branch, after ROLE_CHECK, for non-override path require `v`, `r`, `s`; reject 400 if missing.
- **New stage `PREFLIGHT_SNAPSHOT`** (standard vote only, before broadcast) using a read-only `govRead = new ethers.Contract(networkConfig.governor, GOVERNOR_ABI, provider)`:

```ts
// [GOV_RELAY][STANDARD_VOTE][PREFLIGHT_SNAPSHOT][START]
const snapshotBlock = await withTimeout(
  govRead.proposalSnapshot(onchainId),
  8_000,
  "governor.proposalSnapshot()",
);

const checkAddr = voterAddress || (
  await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("id", userId)
    .maybeSingle()
).data?.wallet_address;

// 1. Strict weight enforcement — zero weight is a fatal rejection.
const weight = await withTimeout(
  govRead.getVotes(checkAddr, snapshotBlock),
  8_000,
  "governor.getVotes()",
);

if (weight === 0n) {
  console.error(
    `[GOV_RELAY][STANDARD_VOTE][PREFLIGHT_SNAPSHOT][FATAL] Wallet ${checkAddr} attempted to vote with 0 weight at block ${snapshotBlock}. Reverting.`,
  );
  return jsonResponse(
    { error: "Wallet has zero voting weight for this proposal snapshot. Access denied.", failed_at: stage },
    409,
  );
}

// 2. Double-vote protection — only runs if they have weight.
const alreadyVoted = await withTimeout(
  govRead.hasVoted(onchainId, checkAddr),
  8_000,
  "governor.hasVoted()",
);

if (alreadyVoted) {
  console.warn(
    `[GOV_RELAY][STANDARD_VOTE][PREFLIGHT_SNAPSHOT][WARN] Wallet ${checkAddr} has already cast a ballot.`,
  );
  return jsonResponse(
    { error: "Wallet has already voted on this proposal.", failed_at: stage },
    409,
  );
}

console.log(
  `[GOV_RELAY][STANDARD_VOTE][PREFLIGHT_SNAPSHOT][SUCCESS] Wallet ${checkAddr} verified with weight: ${weight.toString()}`,
);
// [GOV_RELAY][STANDARD_VOTE][PREFLIGHT_SNAPSHOT][END: OK]
```

Uses the existing `jsonResponse` helper (already includes `corsHeaders` + `Content-Type`), so no new CORS plumbing needed.

- BROADCAST_TRANSACTION branch:
  - `overrideAuthorized === true` → unchanged `gov.castVote(onchainId, supportValue)`.
  - Else → `gov.castVoteBySig(onchainId, supportValue, Number(v), r, s)`.
  - Keep `withTimeout` wrap on submit, `tx.wait()`, audit insert. Add `voter_address: checkAddr` and `via: "castVoteBySig"` to `transactions.metadata`.

### 3. Out of scope

- No change to APPROVE_AND_EXECUTE, CANCEL_PROPOSAL, self-delegation, or tophat override path.
- No migrations, no new secrets, no schema edits.
- Existing telemetry, timeouts, FATAL_CRASH outer try/catch, and CORS preserved.

### Verify

1. Delegated wallet w/ snapshot weight → `SIGN_BALLOT[END:OK]` (client), `PREFLIGHT_SNAPSHOT[SUCCESS]` (server), `castVoteBySig` mined.
2. Zero-weight wallet → server returns 409 with `[FATAL] ... 0 weight`, **no** on-chain broadcast (no relayer gas burned).
3. Already-voted wallet → server returns 409 with `[WARN] already cast a ballot`.
4. Tophat L3 with `tophatOverride: true` → original `castVote` path, no signature required.
