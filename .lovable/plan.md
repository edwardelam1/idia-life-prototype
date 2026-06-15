# Fix EIP-712 Domain Drift on `castVoteBySig`

## Diagnosis (corrections to the brief)

1. The previously-requested "dynamic `name()` fetch" and "client-side `verifyTypedData` pre-flight" are **already implemented** in `src/services/governanceService.ts` → `signBallot()` (lines 578–632). The fallback name in code is `"IDIAGovernor"` (no underscore), not `"IDIA_Governor"`.
2. `ethers.verifyTypedData(domain, types, value, signature)` recovers the signer using the **same domain we just signed against**. It can only catch a corrupted signature buffer — it cannot detect a mismatch with the on-chain separator. The current pre-flight passes even when the on-chain revert is guaranteed. We should remove or repurpose it.
3. The remaining unknowns that can still cause `revert Governor: invalid signature`:
   - `domain.name` — we read `name()` from the contract, but OZ Governor's EIP-712 name is set in the constructor and is NOT required to match `name()`. The two can differ.
   - `domain.version` — hardcoded to `"1"`. OZ default is `"1"` but a custom deploy may use anything.
   - `domain.chainId` — hardcoded from `ACTIVE_DEPLOYMENT`. If the user's signer/provider is on a different chain, this drifts.
   - `domain.verifyingContract` — `PROTOCOL.governor`. Verified by bytecode dissection, OK.

The authoritative source is **EIP-5267 `eip712Domain()`**, which OZ Governor inherits (via `EIP712` v4.7+). It returns the exact `(fields, name, version, chainId, verifyingContract, salt, extensions)` used in `_domainSeparatorV4()`. We should call it once and use its return values verbatim.

## Changes

### 1. `src/services/governanceService.ts`

In `signBallot()` (around lines 578–636), replace the name-only fetch with an `eip712Domain()` call:

```text
- Add a private helper `getGovernorEip712Domain()` that:
  - Instantiates a read-only Contract with ABI:
      function eip712Domain() view returns
        (bytes1 fields, string name, string version,
         uint256 chainId, address verifyingContract,
         bytes32 salt, uint256[] extensions)
  - Returns { name, version, chainId: Number, verifyingContract }
  - On revert (older Governor without EIP-5267), falls back to:
      name   = await gov.name()  || "IDIAGovernor"
      version = "1"
      chainId = ACTIVE_DEPLOYMENT === 'mainnet' ? 8453 : 84532
      verifyingContract = PROTOCOL.governor
  - Logs both the raw on-chain result AND the resolved fallback path
    with tags [GOV_VOTE][DOMAIN][CHAIN_TRUTH] and [GOV_VOTE][DOMAIN][FALLBACK].

- In signBallot():
  - Call the helper, use its result as the `domain` object verbatim
    (do NOT override chainId from ACTIVE_DEPLOYMENT).
  - Log a one-line diff between local-assumed values and chain-truth:
      [GOV_VOTE][DOMAIN][AUDIT] name=<x> version=<y> chainId=<z>
        verifyingContract=<addr> source=<chain|fallback>

- REMOVE the existing client-side ethers.verifyTypedData() block
  (lines ~615–632). It cannot detect on-chain drift and produces
  misleading [PRE_FLIGHT][SUCCESS] signals. Replace it with:
      [GOV_VOTE][PRE_FLIGHT][SIGN][SKIP]
        reason="local recovery cannot validate on-chain separator;
                trusting eip712Domain() chain-truth instead"

- Keep all other logic (Signature.from, returned shape) untouched.
```

### 2. `src/services/governanceRelay.ts`

If this file also constructs its own `domain` object for signing (the prior plan added an explicit `Interface` here), wire it to the same `getGovernorEip712Domain()` helper instead of its hardcoded values. If it only relays an already-built signature, no change.

### 3. `supabase/functions/relay-governance-action/index.ts`

No signing happens here — the edge function only forwards the prebuilt `(v, r, s)` to the contract. **No change needed.** The earlier "ABI alignment" log block added on the server is fine to keep.

### 4. Logging contract (keep granular telemetry)

Preserve the bookended logs the brief requires inside `castVoteBySig` callers:
- `[GOV_VOTE][RELAY_BROADCAST][START]`
- `[GOV_VOTE][RELAY_BROADCAST][SUCCESS]`
- `[GOV_VOTE][RELAY_BROADCAST][FATAL_FAIL]`

These already exist in `governanceRelay.ts` from the prior pass — leave them.

## Verification path after deploy

1. Cast a vote on proposal 1 from the connected wallet.
2. Inspect the new `[GOV_VOTE][DOMAIN][AUDIT]` log line. Confirm `source=chain`.
3. If on-chain returns a different `name` or `version` than `"IDIAGovernor"` / `"1"`, the silent drift is now visible and the next signed tx will already be correct.
4. If `eip712Domain()` reverts (older Governor), the log shows `source=fallback` and we know we must read the deploy constructor args from the verified contract source on BaseScan and hardcode them.

## What we are NOT changing

- `src/config/contracts.ts` (`PROTOCOL.governor`, ABIs) — addresses confirmed correct by bytecode dissection.
- `propose()` 4-arg encoding — unrelated to vote signing, already correct after the prior refactor.
- Edge function relay path or service-role usage.
- Any UI / wallet release-gate flags.
