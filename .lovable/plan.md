# Fix the 401s hitting circular settlement

## What the logs actually show

- The database trigger `trigger_circular_settlement` on `settlement_queue` calls the `idia-circular-settlement` function with a hardcoded **legacy JWT service_role key** in its `Authorization` header.
- Edge logs for the last 72h show a steady stream of `401` responses on cron/trigger-driven functions (`crazy-8-security` every minute, `idia-event-indexer` every 2 minutes). `crazy-8-security` has `verify_jwt = false`, so the rejection is happening at the API gateway on the key itself — the legacy JWT keys are no longer accepted for this project (the app has already moved to the new `sb_publishable_...` key).
- `settlement_queue` currently holds **28 rows in `pending`**, the newest at 2026-08-18 20:32 UTC — settlements are firing, getting 401'd, and never executing.
- 8 of 13 cron jobs and 2 triggers still carry the same legacy JWT string.

## Fix

1. **Unblock now (dashboard, no code):** either re-enable legacy JWT API keys in Supabase → Settings → API Keys, or generate a new **secret key** (`sb_secret_...`). Everything below assumes the new secret key.
2. **Store the key once, not in 10 places:** put the secret key in Supabase Vault and add a small helper so cron jobs and triggers read it at call time instead of embedding a literal token.
3. **Rewrite the two triggers** (`trigger_circular_settlement` on `settlement_queue`, `trigger_ascension_scan` on `committee_applications`) to use a `net.http_post` wrapper function that pulls the key from Vault, replacing `supabase_functions.http_request` with the literal header.
4. **Rewrite the 8 legacy cron jobs** the same way (includes `idia-event-indexer`, `dao-*`, `mint-liability-receipt`, and the `apikey`-style jobs such as `usdc-reconcile` and `seed-marketplace-catalog`).
5. **Drain the backlog:** replay the 28 `pending` settlement_queue rows through `idia-circular-settlement` once auth works, in small batches, and confirm each moves to `completed`/`partial` with ledger rows and tx hashes.
6. **Verify:** re-query the edge logs for 401s over the following 15 minutes and confirm zero, plus a fresh successful settlement run end to end.

## Technical notes

- No change to `supabase/functions/idia-circular-settlement/index.ts` itself is needed — its handler has no auth gate; the 401 is issued by the gateway before the function runs.
- The function is not listed in `supabase/config.toml`, so `verify_jwt` defaults to true. It stays that way; the caller just needs a valid key.
- Vault access pattern: `select decrypted_secret from vault.decrypted_secrets where name = 'edge_call_key'`, wrapped in a `security definer` function owned by postgres so cron/triggers can call it without exposing the value to app roles.
- Backlog replay is a one-off script over `settlement_queue where status = 'pending'`, reusing each row's stored `payload` so amounts and contributor lists are unchanged.

## What I need from you

The new Supabase **secret key** (`sb_secret_...`), or confirmation that you re-enabled legacy JWT keys instead.
