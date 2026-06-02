## Fix: Remove strict `voteWeight` validation in `relay-governance-action`

The CAST_VOTE branch currently rejects requests with `Invalid voteWeight: 0` because the frontend no longer sends a weight (OpenZeppelin Governor calculates it from the snapshot block). Remove the hard requirement while preserving telemetry, timeout guards, and audit metadata.

### Change (single file)

`supabase/functions/relay-governance-action/index.ts`, lines ~140–155:

- Keep the `support` validation (must be 0 | 1 | 2) and the `acaHash` check.
- Remove the `voteWeightNum <= 0` / `!Number.isFinite` rejection.
- Still parse `voteWeight` permissively (`Number(voteWeight)` → `0` if missing/NaN) so it can be attached to the `transactions` audit metadata as an informational field only.

Resulting block:

```ts
if (actionType === "CAST_VOTE") {
  if (support !== 0 && support !== 1 && support !== 2) {
    return jsonResponse({ error: `Invalid support value: ${support}`, failed_at: stage }, 400);
  }
  supportValue = support as 0 | 1 | 2;
  // voteWeight is informational only; contract reads weight from snapshot.
  const parsed = Number(voteWeight);
  voteWeightNum = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  if (!acaHash || typeof acaHash !== "string") {
    return jsonResponse({ error: "Missing acaHash", failed_at: stage }, 400);
  }
}
```

### Out of scope
- No change to `gov.castVote(onchainId, support)` execution.
- No change to telemetry, timeouts, auth, client init, CANCEL_PROPOSAL / APPROVE_AND_EXECUTE branches, or audit insert (it already references `voteWeightNum`, which now safely defaults to 0).

### Verify
Deploy `relay-governance-action` → cast a vote → confirm logs reach `[BRANCH_VALIDATED] branch=CAST_VOTE` and proceed past `VERIFY_IDENTITY` instead of returning 400.
