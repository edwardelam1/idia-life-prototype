## Plan — Frontend EIP-712 payload fix (no edge changes)

**Scope:** `src/services/governanceService.ts` only. Do NOT touch `relay-governance-action`. Standard vote path stays on `castVoteBySig`.

### Findings from audit
- `signBallot()` (line 648) already builds `value = { proposalId: BigInt(proposalId), support }`. Good.
- BUT the console log on line 652 evaluates `value.proposalId` (a BigInt) inside an object literal — fine.
- Risk surface: `proposal.on_chain_id` in `ActiveProposalsList.tsx` is passed as a string; `BigInt(string)` is correct, but any upstream `.toString()` or numeric coercion before reaching `signBallot` could silently mangle the uint256.

### Changes
1. **`src/services/governanceService.ts` → `signBallot()` (≈ lines 623–665):**
   - Normalize input once at the top: `const proposalIdBig = typeof proposalId === "bigint" ? proposalId : BigInt(proposalId);`
   - Use `proposalIdBig` (raw BigInt) in the `value` object — never `.toString()`, never `Number()`.
   - Update the debug log to print `proposalIdBig.toString()` only inside the log string (logging only), keeping the signed `value.proposalId` as a pure BigInt.
   - Add an assertion: if `typeof value.proposalId !== "bigint"` throw before `signTypedData`, so any future regression fails loudly instead of producing a bad EIP-712 hash.

2. **`src/services/governanceService.ts` → `compileStrictCastVoteBySigRelayPayload()` (≈ lines 689–694):**
   - Confirm the `encodeFunctionData` call already passes `BigInt(proposalId)` (it does). Leave intact.
   - Keep `secureRelayBody.proposalId: proposalId.toString()` — this is JSON transport only, not the signed payload, and the edge function re-`BigInt()`s it.

### Out of scope
- `supabase/functions/relay-governance-action/index.ts` — unchanged.
- `castVoteBySig` ABI, relayer broadcast path, role checks, preflight — unchanged.
- `ActiveProposalsList.tsx` — unchanged (already passes the string on_chain_id, which `BigInt()` accepts correctly).

### Verification
- After change, trigger a standard vote, confirm edge logs show `castVoteBySig` broadcast and no `0x94ab6c07` revert. The EIP-712 digest now matches the on-chain Governor's recovered signer (`0x429F…`).