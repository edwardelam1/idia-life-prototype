## Change Alchemy RPC poll cadence to hourly

There is no inbound Alchemy webhook in this project. The "Alchemy update" is the client-side wallet-balance poller in `src/hooks/useWalletBalance.ts` that hits the Alchemy Base RPC every 15 seconds.

### Change
- `src/hooks/useWalletBalance.ts` (lines 272–277): change the `setInterval` cadence from `15000` to `3600000` (1 hour) and update the log line/comment to reflect "60-minute polling tick".

Realtime Supabase subscriptions and the on-auth-change refetch are left intact, so balances still refresh on sign-in and on relevant DB events — only the background polling drops to once per hour.

### Out of scope
- No edge function, cron, or DB changes (no Alchemy webhook function exists).
- If you actually meant a server-side Alchemy webhook/cron we haven't built yet, tell me and I'll scaffold one instead.