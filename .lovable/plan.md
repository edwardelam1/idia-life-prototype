## 1. Swap `crazy-8-security` from Gemini → OpenAI

Edit `supabase/functions/crazy-8-security/index.ts`:

- Replace `GEMINI_API_KEY` env read with `OPENAI_API_KEY`.
- Replace `callGeminiAPI(prompt)` with `callOpenAI(prompt)` that POSTs to `https://api.openai.com/v1/chat/completions`:
  - Model: `gpt-4o-mini` (fast, cheap, JSON-mode capable — good fit for the 8 agent JSON schemas). Ask if you'd prefer `gpt-4o`.
  - Body: `{ model, messages: [{role:"system", content: persona-agnostic instruction to return strict JSON}, {role:"user", content: prompt}], response_format: { type: "json_object" }, temperature: 0.1, max_tokens: 2048 }`
  - Headers: `Authorization: Bearer ${OPENAI_API_KEY}`, `Content-Type: application/json`.
  - Parse `data.choices[0].message.content` as JSON; keep the existing "invalid JSON" fallback shape.
- Update startup log line to `OPENAI_API_KEY configured: …` and bump version tag to `v3.0 (openai)`.
- Leave all agent personas, routing, `logSecurityEvent`, auth guard, and CORS untouched.

No secret work needed — user confirmed `OPENAI_API_KEY` is already in Supabase.

## 2. Route negative-consent survivors to Execution Phase + Tracker

**Root cause:** Today, `dao_execution_tasks` and the "Archive · Execution Phase" list only enrol when the on-chain governor reports state = 5 (Queued). "Test proposal for new contract" cleared negative consent (`dao_pending_actions.status = 'executed'`) but its on-chain state is still 4 (Succeeded) — so it lives in "Successful Quorum Reached" and never appears in the Execution Tracker or Execution Phase archive.

Fix: treat "pending action executed" (i.e. survived negative consent) as an equivalent trigger for execution-phase enrolment.

### 2a. `dao-veto-tally/index.ts`

When the tally transitions status to `executed` (timelock expired, veto threshold not met):

1. Look up `dao_proposals` by `onchain_proposal_id`.
2. If found:
   - Update `dao_proposals`: `lifecycle_phase = 'awaiting_execution'`, `status = 'awaiting_execution'`.
   - Upsert into `dao_execution_tasks` (keyed on `proposal_id`): `{ proposal_id, onchain_proposal_id, title, category, execution_deadline_at = now + 7d, initial_deadline_at = same, status: 'ready' }` — skip if a row already exists.
3. Best-effort — warn and continue on error, don't break the tally response.

### 2b. `dao-timelock-sweep` (cron) — same enrolment

The 48h auto-sweep marks pending actions `executed` without calling `dao-veto-tally`. Apply the same "look up dao_proposals + upsert execution task + flip lifecycle_phase" block there so cron-driven survivors also appear. (Read the file first to confirm the exact update site; add the block immediately after the `status → 'executed'` write.)

### 2c. `ExecutionPhaseList.tsx`

Extend `EXECUTION_PHASES` set to include `awaiting_execution` so the frontend picks up rows the indexer/veto-tally now mark, even when the chain state is still 4 (Succeeded). No other UI changes needed — `ProposalCard`, glow, notification, and seen-set logic all keep working.

### 2d. Backfill the existing survivor

One-off migration (via supabase--migration): for every `dao_pending_actions` row with `status = 'executed'` that has an `onchain_proposal_id` matching a `dao_proposals.on_chain_id`, run the 2a logic (update lifecycle_phase + upsert execution task). Covers "Test proposal for new contract" and any other historical rows that already survived negative consent.

## Verification

- Deploy `crazy-8-security`; hit `/health`; run one agent call end-to-end and confirm no `Gemini API error` in logs.
- Deploy `dao-veto-tally` + `dao-timelock-sweep`; run the backfill migration; refresh the governance tab and confirm "Test proposal for new contract" now appears under **Archive · Execution Phase** and in the **Execution Tracker** card on the Delaware MSA panel.
