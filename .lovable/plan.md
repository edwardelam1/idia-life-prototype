Implement a strict end-to-end vote relay mapping that removes the remaining spread/wrapper risk and makes `support` and `v` impossible to collide.

1. Update `src/services/governanceRelay.ts`
   - Add a dedicated `relayCastVoteBySig()` function for `CAST_VOTE` only.
   - Accept scalar inputs, not a prebuilt payload object: `proposalId`, `support`, `voteWeight`, `rawSignatureString`, `signerAddress`, `acaHash`, `chainId`.
   - Build `verifiedHttpBody` inline with literal lowercase keys only:
     - `actionType`, `proposalId`, `support`, `voteWeight`, `tophatOverride`, `voterAddress`, `acaHash`, `chainId`, `v`, `r`, `s`.
   - Use `ethers.Signature.from(rawSignatureString)` inside this function so `v/r/s` are derived at the final network boundary.
   - Dispatch directly with `supabase.functions.invoke("relay-governance-action", { body: verifiedHttpBody })`.
   - Add the requested logs:
     - `[GOV_VOTE][NET_DISPATCH][START] Marshalling literal body fields for edge consumption.`
     - `[GOV_VOTE][NET_DISPATCH] Raw serialization printout check: ...`
     - `[GOV_VOTE][RELAY_BROADCAST][START] Pushing explicit 5-argument layout payload to Deno edge gateway.`
     - `[GOV_VOTE][RELAY_BROADCAST][SUCCESS] Gasless transaction processed. Hash: ...`
     - `[GOV_VOTE][RELAY_BROADCAST][FATAL_FAIL] Core transaction thread dropped. Reason: ...`

2. Update `src/components/governance/ActiveProposalsList.tsx`
   - Remove the remaining `{ ...governanceService.compileStrictCastVoteBySigRelayPayload(...) }` spread in the standard gasless vote path.
   - Call `relayCastVoteBySig()` with explicit scalar arguments instead of passing a dynamic container into `supabase.functions.invoke`.
   - Keep the Tophat override path separate with its own literal body and no `v/r/s` fields.
   - Add a pre-dispatch assertion that rejects if `support` is not `0 | 1 | 2` or if `support === ballotSig.v`, catching the exact `v=28` shift before network transit.

3. Update `src/services/governanceService.ts`
   - Keep `signBallot()` as the signer/typed-data verifier.
   - Simplify or stop using `compileStrictCastVoteBySigRelayPayload()` for network dispatch so no generated interface payload can bypass the final literal mapper.
   - Leave selector verification for `castVoteBySig(uint256,uint8,uint8,bytes32,bytes32)` in place as a local sanity check.

4. Tighten `supabase/functions/relay-governance-action/index.ts`
   - Normalize `support` and `sigV` from the raw body immediately after parsing.
   - Log both raw and normalized values before validation.
   - Hard-return `400` before any `ethers.Contract` call if:
     - `support` is missing,
     - `support` is not `0`, `1`, or `2`,
     - `support` is `27` or `28`, indicating signature shift,
     - `sigV` is not `27` or `28` for standard votes.
   - Keep the contract call explicit: `gov.castVoteBySig(onchainId, normalizedSupport, normalizedV, sigR, sigS)`.

5. Verify with targeted checks
   - Confirm the final client serialization log prints `support: 0|1|2` and `v: 27|28` as separate lowercase keys.
   - Confirm the edge log prints matching raw and normalized values before the contract call.
   - No migrations or schema changes are needed.