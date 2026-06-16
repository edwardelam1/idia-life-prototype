# Surface granular Governor errors in Active Proposals vote flow

## Problem
When `relay-governance-action` returns a non-2xx with a rich JSON body (e.g. `{ error_selector: "0x94ab6c07", decoded_error, error }`), the Supabase JS client throws a `FunctionsHttpError` and traps the raw `Response` on `relayErr.context`. The current handler at `src/components/governance/ActiveProposalsList.tsx` lines 735–758 reads `relayErr.context.error` directly (which is `undefined` on a Response object) and falls back to the generic `"Edge Function returned a non-2xx status code"` message, hiding the cryptographic selector from the operator.

## Change (scoped to one file)
`src/components/governance/ActiveProposalsList.tsx`, replace the error block at lines 735–758:

1. Await `relayErr.context.json()` (guarded with try/catch via `.catch(() => null)`) when `context.json` is a function; fall back to `relayErr.context` if it already looks parsed.
2. Build `raw` from `customPayload.decoded_error || customPayload.error || relayErr.message || relayData.error || "Governor rejected the vote."`.
3. Add a new branch: if `customPayload.error_selector === "0x94ab6c07"` or `/GovernorInvalidSignature/.test(raw)`, set friendly to:
   `"Signature mismatch (0x94ab6c07). Ensure your wallet is signing the proposalId as a BigInt integer, not a string."`
4. Preserve the existing `UnexpectedProposalState`, `already voted`, and `gas` branches.
5. Log `customPayload || relayErr` so the full decoded payload reaches the browser console.
6. Keep the toast title behavior (`tophatOverride ? "Override failed" : "Transaction Failed"`), keep `s.fail(...)` and the early `return` — no `dao_votes` insert, no state flip.

## Out of scope
- `src/services/governanceService.ts` — `signBallot()` already enforces raw `BigInt` for `proposalId` with a runtime guard (applied in the prior turn). No further change needed.
- `supabase/functions/relay-governance-action/index.ts` — unchanged. The edge function already emits the JSON we want to surface.
- `src/services/governanceRelay.ts` — the `0x94ab6c07` interception added previously stays; the new UI unpacker is additive and consumes whichever fields arrive.

## Verification
After the edit, retrigger a standard vote against a proposal that reproduces `0x94ab6c07`. Expect: toast description shows the "Signature mismatch (0x94ab6c07)…" string, and the console logs the full `customPayload` object (with `error_selector`, `decoded_error`, `args`, `raw`).
