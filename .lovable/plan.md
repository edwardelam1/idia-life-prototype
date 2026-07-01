## Fix 1 · IDIA governance token not displaying (wallet 0x…b582)

**Root cause:** During the account reconciliation, the Legal Defense hat and committee application were moved from the stale email account (`f60af0ab…`, edwardelam90@gmail.com) to Edward's Apple ID account (`143ab69a…`, edwardisawesome1017@outlook.com) — but the `wallet_address` on `profiles` was **not** moved. The Apple account has `wallet_address = NULL`, so `useWalletBalance` skips the on-chain fetch and IDIA stays at 0.

RLS on `profiles` is fine (`Users can view their own profile` + `Enable read access for all users`, both permissive SELECT). It's a data-alignment problem, not a policy problem.

**Change (data-only, via insert tool — one transaction):**

1. `UPDATE profiles SET wallet_address = NULL WHERE id = 'f60af0ab-2309-4846-a1d6-2d3dd72614d6'` (release b582 from the stale account first, so the unique constraint on `wallet_address` doesn't collide).
2. `UPDATE profiles SET wallet_address = '0x1767140B7d7E7dFa8eabcb8b62E5Cc99F563b582' WHERE id = '143ab69a-14fe-4744-a635-ce06a1f3d79b'` (attach it to the Apple ID account that already owns the Legal Defense hat).

No schema change. No code change. After Edward reloads, `useWalletBalance` will see `wallet_address` on his Apple account and hydrate USDC / IDIA / ETH / voting power from Base mainnet.

## Fix 2 · Any committee member can open any roster

Currently the `View Roster` chip in `src/components/governance/CommitteesList.tsx` (line ~452) is gated behind `ascensionLevel === 3` (Tophat only). Per your answer, we widen it so any user holding at least one active committee hat (L1 or higher) can view every committee's roster.

**Change (frontend-only):**

- In `CommitteesList.tsx`, replace the `ascensionLevel === 3` gate on the `View Roster` button with `userActiveHats.size > 0 || ascensionLevel >= 2` (i.e. any active committee-hat holder, oversight chair, or tophat). Non-members still don't see it.
- The roster modal itself already reads `dao_hats` with a permissive `Allow authenticated read access` SELECT policy, so no RLS change is needed — the modal will just work for L1/L2 members.

No DB migration. Roster read path is unchanged.

## Out of scope

- The `217c6224…` (edward.elam@gmail.com) account with its own full hat set is left untouched.
- No changes to promote/demote controls inside the roster modal — those still require Tophat via the `oversight-chair-toggle` edge function.
