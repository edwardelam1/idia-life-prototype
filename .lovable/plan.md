## Plan

1. **Centralize the secure vote relay body in `governanceService.ts`**
   - Update `StrictCastVoteBySigRelayPayload` to include the exact edge-function ingestion fields: `actionType`, `proposalId`, `support`, `voteWeight`, `tophatOverride`, `voterAddress`, `acaHash`, `chainId`, `v`, `r`, `s`.
   - Refactor `compileStrictCastVoteBySigRelayPayload()` so it builds one complete object from explicit named inputs instead of being merged into a pre-existing object.
   - Use `ethers.Signature.from(ballot.signature)` inside that function and emit the requested alignment logs:
     - `[GOV_VOTE][ALIGNMENT][START] Checking signature structure configurations.`
     - `[GOV_VOTE][ALIGNMENT][SUCCESS] JSON packet configured for relayer body payload: ...`

2. **Remove the unsafe object-merge dispatch pattern in `ActiveProposalsList.tsx`**
   - Replace the current `relayPayload` base object + `Object.assign(...)` signature overlay with one explicitly constructed `secureRelayBody` for standard gasless votes.
   - Keep the Tophat override path separate, since it intentionally does not carry `v/r/s`.
   - Ensure `support` remains `Number(chainSupport)` and `v` remains `signatureObject.v`, never positional or array-derived.

3. **Tighten relay-side diagnostics in `relay-governance-action`**
   - Add a parse-stage log that prints the normalized vote ingestion layout (`support`, `sigV`, `hasR`, `hasS`, `voterAddress`) before the contract call.
   - Keep the existing edge-function contract call as `gov.castVoteBySig(onchainId, supportValue, Number(sigV), sigR, sigS)`.

4. **Verify selector/argument order without changing database schema**
   - Confirm the client logs and edge logs show `support=0|1|2` and `v=27|28` independently before deployment automation runs.
   - No migrations or Supabase table changes are needed.