# Fix relay edge function "module not found" errors

## Symptom

Edge function (deployment `66cd0c5f...` — `relay-governance-action`) logs:

```
module "/utf-8-validate@5.0.10/denonext/package.json" not found
module "/bufferutil@4.1.0/denonext/package.json" not found
```

These fire on cold start and break the function before it can handle the request — which is why the recent cancel/relay attempts surface as opaque edge errors.

## Root cause

All three relay edge functions import ethers via esm.sh:

```ts
import { ethers } from "https://esm.sh/ethers@6.13.0";
```

esm.sh's bundle of ethers transitively pulls `ws`, which has optional native deps `bufferutil` and `utf-8-validate`. esm.sh's denonext build references them as package.json sub-modules that aren't actually published in that path, so Deno's edge-runtime fails the resolve at boot. This is a known esm.sh + ws issue and is fixed by switching to the `npm:` specifier, which lets Deno's npm resolver mark those optional deps as truly optional.

## Fix

Switch the ethers import in all three relay functions from esm.sh to npm:

```ts
import { ethers } from "npm:ethers@6.13.0";
```

Files:
- `supabase/functions/relay-governance-action/index.ts` (line 13)
- `supabase/functions/relay-delegation/index.ts` (line 13)
- `supabase/functions/relay-usdc-transfer/index.ts` (line 11)

No code logic changes — the ethers v6 API surface is identical between the two specifiers.

If a stale `supabase/functions/deno.lock` exists after the swap and the deploy still fails, delete it so edge-runtime regenerates a clean lockfile against the npm specifier.

## Out of scope

- The client-side cancel flow in `ActiveProposalsList.tsx` (already correct — uses the in-app wallet, not this edge function).
- Any change to relayer signing semantics. Governor.cancel still must be signed by the proposer; this fix only unblocks the other relay actions (`APPROVE_AND_EXECUTE`, `delegateBySig`, USDC transfers) that legitimately go through the relayer.
