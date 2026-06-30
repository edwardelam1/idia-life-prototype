## Findings

- New Base mainnet governor: `0xc59120a33C9baeF4ee10847e403221C1040773d9` (replaces `0x9777067CAd2892D20decAF1a5ccb78e6B291B87a`).
- Shawn already added `GOVERNOR_ADDRESS` as a Supabase Edge Function secret. Edge functions can read it via `Deno.env.get("GOVERNOR_ADDRESS")` even though Lovable's `fetch_secrets` doesn't list dashboard-added secrets.
- Three places still reference the old address:
  - `src/config/contracts.ts` — frontend source of truth (user pasted the corrected version).
  - `supabase/functions/relay-governance-action/index.ts` line 90.
  - `supabase/functions/governance-indexer/index.ts` line 19.

## Changes

### 1. `src/config/contracts.ts` (frontend)
Overwrite with the exact file the user pasted. Only material delta: `mainnet.governor` flips to `0xc59120a33C9baeF4ee10847e403221C1040773d9`. Other addresses and ABIs unchanged.

### 2. `supabase/functions/relay-governance-action/index.ts`
- Inside the request handler, resolve the governor address with this precedence:
  1. `Deno.env.get("GOVERNOR_ADDRESS")` if `ethers.isAddress(...)` validates.
  2. Otherwise fall back to the new literal `0xc59120a33C9baeF4ee10847e403221C1040773d9` and log a loud `[GOV_RELAY][BOOT][WARN] GOVERNOR_ADDRESS missing/invalid, using literal fallback`.
- Replace the hardcoded `NETWORKS[8453].governor` with this resolved value when building the network config / Contract instance.
- Emit a one-time boot log: `[GOV_RELAY][BOOT] governor=<address> source=<env|fallback>` so every cold start makes the active address visible in function logs.

### 3. `supabase/functions/governance-indexer/index.ts`
- Same env-first resolver inside `serve(...)` (read, validate, fallback to the new literal, log).
- Use the resolved value when constructing `new ethers.Contract(...)`.
- Remove the top-level `GOVERNOR_ADDRESS` const (or update it to the new literal as fallback only).

### 4. Verification
- Auto-deploy on save. Trigger a vote from the UI; expected log line: `[GOV_RELAY][BOOT] governor=0xc59120a33C9baeF4ee10847e403221C1040773d9 source=env`. 
- If the line shows `source=fallback`, the secret name in Supabase doesn't match `GOVERNOR_ADDRESS` exactly (case-sensitive) — but the relay still works against the new address via the literal fallback.
- Confirm a fresh `castVoteBySig` no longer returns `GovernorNonexistentProposal`.

## Out of scope
- Stale `dao_proposals` rows whose `proposal_id` was minted against the old governor will still fail preflight; per your earlier direction we're leaving them in place (not archiving).
- No DB migration. No other contract addresses changed.
