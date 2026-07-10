## Goal

Prevent low-effort or legally risky proposals from ever anchoring on-chain by enforcing:
1. A **hard 50-word minimum** on the description (client-side, pre-signature).
2. A **pre-chain AI validation gate** that checks structure/legibility and screens for content that could legally harm IDIA Data Inc. or IDIA DUNA.

Currently AI validation runs *after* the on-chain anchor + DB insert, so bad proposals still land live. This flips the order: validate first, chain second.

## Changes

### 1. `src/components/governance/CreateDaoProposalModal.tsx`
- Add a live word-count helper under the description field (`X / 50 min`), green when ≥50.
- Require `title.trim().length >= 5`, `category` selected, and `description` word count `>= 50` before the Submit button enables (remove the "testing mode" bypass on required fields).
- On submit, **before** calling `walletService.getConnectedSigner()` for the chain anchor:
  1. Invoke the upgraded `validate-proposal` edge function with `{ title, description, category }` in a **pre-flight** mode (no `proposalId` yet).
  2. If the function returns `status: "rejected"` or `legal_risk: "high"`, show a destructive toast with the returned `feedback` (and `legal_reasons` if present), abort submission — no wallet prompt, no DB write.
  3. If `status: "under_review"` with medium legal risk, show a confirmation dialog listing concerns; user must explicitly proceed.
  4. Only on `status: "approved"` (or user-confirmed under_review) do we proceed to the existing chain-anchor + DB insert flow.
- Remove the redundant post-insert `validate-proposal` call (validation now gates entry, not audits it after).
- Keep the `TEMP_DISABLE_AI_VALIDATION` flag but default it to `false` and only skip the AI call — the 50-word gate always applies.

### 2. `supabase/functions/validate-proposal/index.ts`
- Support pre-flight mode: if `proposalId` is omitted, skip the DB update and just return the verdict.
- Rewrite the system + user prompt to explicitly score two axes:
  - **Structural legibility** (0–10): coherent English, on-topic, actionable, ≥50 meaningful words.
  - **Legal risk to IDIA Data Inc. / IDIA DUNA** (`none` | `low` | `medium` | `high`) with `legal_reasons: string[]`. Flag: defamation, incitement, targeted harassment, promises of unregistered securities/yields, unlawful directives, IP infringement, doxxing, sanctions/OFAC concerns, or fiduciary-breach instructions.
- Return JSON: `{ score, feedback, legal_risk, legal_reasons, status }` where `status` is:
  - `approved` — score ≥ 7 AND legal_risk in (`none`,`low`).
  - `under_review` — score 4–6 OR legal_risk `medium`.
  - `rejected` — score < 4 OR legal_risk `high`.
- Switch the model call to Lovable AI Gateway (`openai/gpt-5.5` via `LOVABLE_API_KEY`) using the AI SDK `Output.object` pattern rather than raw OpenAI — matches project standard and removes the `OPENAI_API_KEY` dependency for this function.
- Keep the post-insert branch (`proposalId` present) working for the legacy `ProposalForm.tsx` path so it doesn't break.

### 3. Minor
- Add a small `countWords(text)` util inline in the modal (`text.trim().split(/\s+/).filter(Boolean).length`).
- Toast copy for rejection is user-facing but never quotes the raw model output verbatim — always via `feedback`.

## Out of scope
- No changes to `ProposalForm.tsx` (legacy path), motion escalation, or the Governor contract.
- No new DB columns; verdict is transient pre-chain.

## Technical notes
- Pre-flight validation adds ~1–3s latency before the wallet prompt — acceptable trade for blocking harmful on-chain writes.
- Requires `LOVABLE_API_KEY` secret (already present per project standards; will prompt to add if missing).
