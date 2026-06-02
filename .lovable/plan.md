## Harden `governance-indexer` LOAD_PENDING against DB write race

**File:** `supabase/functions/governance-indexer/index.ts`

**Change scope:** Single block — the `LOAD_PENDING` stage only. No changes to CHAIN_ANCHOR, DB_WRITE, telemetry envelope, frontend, schema, or secrets.

### Edit

Replace the current single-shot `LOAD_PENDING` query (lines ~85–101) with a 3-attempt polling loop, 1500 ms backoff between attempts. Loop exits early on the first non-empty result. DB errors still fail fast with 500. Empty after all 3 attempts returns `{ ok: true, processed: 0, message: "No pending rows found to reconcile." }` (200) — preserves current "nothing to do" semantics for cron sweeps.

```typescript
console.log("[INDEXER][LOAD_PENDING][START] Fetching un-indexed rows from governance_proposals");
let pendingRows: any[] = [];
let dbAttempts = 0;
const maxDbAttempts = 3;
while (dbAttempts < maxDbAttempts) {
  dbAttempts++;
  const { data, error } = await supabaseAdmin
    .from("governance_proposals")
    .select("id, proposal_id, description, targets, callvalues, calldatas")
    .or("state.is.null,state_name.eq.Unknown")
    .limit(25);
  if (error) {
    console.error(`[INDEXER][LOAD_PENDING][FATAL] Database query error:`, error);
    return jsonResponse({ error: error.message }, 500);
  }
  if (data && data.length > 0) {
    pendingRows = data;
    break;
  }
  if (dbAttempts < maxDbAttempts) {
    console.log(`[INDEXER][LOAD_PENDING][RETRY] 0 rows found. Attempt ${dbAttempts}/${maxDbAttempts}. Waiting 1500ms for DB write to commit...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
console.log(`[INDEXER][LOAD_PENDING][END:OK] ${pendingRows.length} pending row(s) selected after ${dbAttempts} check(s).`);
if (pendingRows.length === 0) {
  return jsonResponse({ ok: true, processed: 0, message: "No pending rows found to reconcile." }, 200);
}
```

### Notes

- Select list adds `id` (was: `proposal_id, description, targets, callvalues, calldatas, state, state_name`) per the user's snippet. Downstream loop only reads `proposal_id`, `description`, `targets`, `callvalues`, `calldatas` — unaffected.
- Worst-case added latency when truly empty: ~3 s (2 × 1500 ms waits). Acceptable inside an edge function; well under timeout budget.
- Post-trigger race from `governanceService.triggerIndexer()` is the target case — the loop absorbs Postgres commit lag before Chain Anchor polling begins.
- No change to `anchored`/`failed` response shape on the populated path.
