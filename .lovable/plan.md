## Plan

1. **Restore the Governor v5 vote ABI everywhere**
   - In `supabase/functions/relay-governance-action/index.ts`, replace the current 5-argument `castVoteBySig(uint256,uint8,uint8,bytes32,bytes32)` entry with the v5 4-argument signature:
     ```ts
     castVoteBySig(uint256 proposalId, uint8 support, address voter, bytes signature)
     ```
   - Keep the Governor custom error ABI entries, especially `GovernorInvalidSignature(address)`, so future reverts remain decoded.
   - In `src/config/contracts.ts`, update the shared frontend `GOVERNOR_ABI` to the same v5 4-argument layout.

2. **Normalize the raw 65-byte signature hex in the edge function**
   - Before broadcasting a standard gasless vote, inspect `signatureHex` directly.
   - If it is a valid 132-character `0x` signature and the final byte is `00` or `01`, mutate only that suffix to `1b` or `1c`.
   - Log the requested stages:
     - `[GOV_RELAY][STANDARD_VOTE][NORMALIZE][START]`
     - `[GOV_RELAY][STANDARD_VOTE][NORMALIZE][SUCCESS]`
     - `[GOV_RELAY][STANDARD_VOTE][NORMALIZE][SKIP]`
     - `[GOV_RELAY][STANDARD_VOTE][NORMALIZE][WARN]`

3. **Broadcast with the v5 layout and preserve gas override**
   - Replace the current `ethers.Signature.from(...); gov.castVoteBySig(onchainId, supportValue, v, r, s, { gasLimit: 300000 })` call with:
     ```ts
     gov.castVoteBySig(onchainId, supportValue, preflightAddr, finalSignatureHex, {
       gasLimit: 300000,
     })
     ```
   - Keep the existing snapshot/state/hasVoted preflight diagnostics and structured error payloads.
   - Fail safely if the preflight voter address is unavailable before the standard v5 broadcast.

4. **Align the client-side relay preview encoder**
   - In `src/services/governanceRelay.ts`, change the diagnostic `ethers.Interface` fragment back to the v5 4-argument layout.
   - Encode with `proposalId`, `support`, `voter`, and the raw signature bytes, without splitting into `v/r/s` on the client.
   - Leave the HTTP body shape unchanged: the edge function still receives `signature`, `voterAddress`, and `voter`.

5. **Deploy and verify**
   - Deploy `relay-governance-action` after implementation.
   - Verify logs show the normalization and v5 broadcast path, especially:
     - `[GOV_RELAY][STANDARD_VOTE][NORMALIZE][SUCCESS]` or `[SKIP]`
     - `[GOV_RELAY][STANDARD_VOTE][BROADCAST][START] Pushing v5 payload to EVM mempool.`