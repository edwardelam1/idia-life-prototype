## Root cause recap

Supabase disabled the legacy `eyJ…` anon JWT. Three stale references remain and together explain both symptoms:

- **Proposals spinning** — `src/components/ProposalForm.tsx:83` hard-codes the legacy JWT in `Authorization: Bearer …` on the `fetch(validate-proposal)` call. The gateway rejects it, the promise never resolves cleanly, the form stays in its submitting state.
- **USDC / ETH / IDIA = 0** — Any session minted under the old key is still cached in `localStorage`. `useWalletBalance` calls `supabase.auth.getUser()` and then reads `profiles.wallet_address`; with a rejected token `wallet_address` comes back empty and every on-chain read is skipped. RPC is healthy.
- **`.env` hygiene** — `VITE_SUPABASE_PUBLISHABLE_KEY` still pins the legacy JWT. Nothing in `src/` reads it today (client.ts hard-codes the key), but it must be cleaned so no contributor or future code path picks up the dead token.

Edge functions read `Deno.env.get("SUPABASE_ANON_KEY")`, which Supabase auto-rotates platform-side — no edge changes needed.

## Architectural correction (flagged, not silently ignored)

The instruction said `client.ts` reads `VITE_SUPABASE_ANON_KEY`. It does not — line 6 hard-codes `sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B`, and `.env` currently exposes `VITE_SUPABASE_PUBLISHABLE_KEY`, not `VITE_SUPABASE_ANON_KEY`. To honour the intent (zero legacy JWT anywhere in `.env`) without inventing a fictional wiring, I will:

1. Replace the legacy value in the existing `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Add `VITE_SUPABASE_ANON_KEY` as an alias holding the same new key, so any code path or contributor reaching for either name resolves to the rotated publishable key.

If you'd rather I delete `VITE_SUPABASE_PUBLISHABLE_KEY` and keep only `VITE_SUPABASE_ANON_KEY`, say so before I switch to build mode.

## Changes

### 1. `.env`
```env
VITE_ALCHEMY_RPC_URL="https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N"
VITE_SUPABASE_PROJECT_ID="zxyngqciipcvveigrzqt"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B"
VITE_SUPABASE_ANON_KEY="sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B"
VITE_SUPABASE_URL="https://zxyngqciipcvveigrzqt.supabase.co"
```

### 2. `src/components/ProposalForm.tsx` (kill hard-coded legacy JWT)
Replace the raw `fetch(/functions/v1/validate-proposal, { Authorization: Bearer eyJ… })` block with `supabase.functions.invoke('validate-proposal', { body: {...} })`. The SDK uses the current publishable key and live session automatically. Wrap with the standardised bookend trace:

```ts
console.log("[PROPOSAL_FORM][VALIDATION_SUBMIT][START] Invoking edge engine for proposal checking...");
const { data, error } = await supabase.functions.invoke('validate-proposal', {
  body: { proposalId: proposal.id, title: title.trim(), description: description.trim(), category },
});
if (error) {
  console.error("[PROPOSAL_FORM][VALIDATION_SUBMIT][END:FAIL]", error.message);
  // existing failure path
} else {
  console.log("[PROPOSAL_FORM][VALIDATION_SUBMIT][END:OK] Proposal structural constraints verified.");
}
```

Response shape, downstream toast, and tracker calls stay identical.

### 3. `src/App.tsx` — one-shot stale-session guard with explicit telemetry
Insert before the existing `supabase.auth.getSession().then(...)` inside the boot `useEffect`. Per the established pattern, **does not** `await` inside `onAuthStateChange`:

```ts
console.log("[AUTH_SESSION_GUARD][CHECK][START] Validating current user session keys against rotated JWT secrets.");
supabase.auth.getSession().then(({ data: { session }, error }) => {
  const looksLegacy = !!session?.access_token?.startsWith("eyJhbGciOiJIUzI1NiI");
  if (error || looksLegacy) {
    console.warn("🚨 [AUTH_SESSION_GUARD][INVALID_KEY]: Stale or compromised token detected from legacy platform configuration. Initiating local state purge.");
    supabase.auth.signOut({ scope: 'local' }).then(() => {
      console.log("[AUTH_SESSION_GUARD][PURGE][END:OK] Compromised local storage markers cleared safely. Redirecting client to authentication gate.");
      window.location.reload();
    });
    return;
  }
  console.log("[AUTH_SESSION_GUARD][CHECK][END:OK] Session keys authenticated successfully under current perimeter.");
});
```

The existing `getSession` → `setSession` + `onAuthStateChange` subscription continues to run for healthy sessions; the guard short-circuits with a reload only for legacy/invalid tokens.

## Out of scope (intentionally)

- No edge-function code changes — `SUPABASE_ANON_KEY` is auto-rotated server-side.
- No DB migration, no RLS or grants work, no UI styling.
- `supabase/functions/submit-connection-rating/index.ts` keeps its harmless fuzzy fallback to `VITE_SUPABASE_PUBLISHABLE_KEY` (that env var doesn't exist in the Deno runtime, so the primary `SUPABASE_ANON_KEY` lookup wins).

## Verification

- `grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" .` (outside `node_modules`) → zero hits.
- Reload `/` while signed in under a fresh post-rotation session → wallet card shows real USDC / ETH / IDIA.
- Reload `/` while holding a stale cached legacy session → console shows the `[AUTH_SESSION_GUARD]` purge sequence, page reloads to `/auth`.
- Submit a proposal → `[PROPOSAL_FORM][VALIDATION_SUBMIT][START]` then `[END:OK]`, spinner clears, proposal lands in Active Proposals.

## Files touched

- `.env`
- `src/components/ProposalForm.tsx`
- `src/App.tsx`
