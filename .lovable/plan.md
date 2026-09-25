# Wallet address: confirmed saved, no fix needed

## What the database shows right now
The `profiles` table has the address for Cedrick Spencer (spencercedrick6@gmail.com):

- wallet_address: 0x4B813de54Fa2f0d982E89833301644aaDF9566e1
- last updated: 2026-09-25 16:13:51 UTC
- seed backup: marked done
- profile created: 2026-07-18 (existing account, not a brand-new signup)

## Likely explanation
The auth logs show his session updating his account at 16:12 UTC, and the profile row was written about a minute later (16:13). If you checked the profiles table before then, the address wasn't there yet. Refresh the table view in Supabase and it should appear.

## Proposed action
- No code changes.
- If another user's address goes missing, send me their email and I'll trace that account.
