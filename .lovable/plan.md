## Adopt `merge/lovable-sync-2` from GitHub

I cloned the branch (`7cd2ddf` — "Add SynapseVault approval to provisioning, update GovernorV3 address") and diffed it against the current project. Here's what it changes and how I'd apply it — **plus two issues in the branch you need to know about before I copy anything in**.

### ⚠️ Issues found in the branch

1. **`supabase/functions/relay-governance-action/index.ts` contains unresolved Git merge conflict markers** (`<<<<<<< Updated upstream` … `>>>>>>> Stashed changes` at lines 31, 44, 57, 74). The file will not run as-is. It also drops the env-first `GOVERNOR_ADDRESS` resolver we added last week and hardcodes the fallback.
2. **`supabase/functions/governance-indexer/index.ts`** in the branch is a *different* revision (521 lines vs our 350) — it appears to be an older/parallel rewrite, not a strict superset. Blindly overwriting would lose our recent lifecycle-phase archival work.

I will **not** overwrite those two files silently. See "Files I'll skip / reconcile" below.

### What I'll copy in (safe adds)

**New edge functions** (10 new folders, all self-contained, no conflicts):
- `funding-round-distribute/`, `funding-round-indexer/`
- `mint-liability-receipt/`
- `pending-wallet-recovery/`
- `synapse-purchase-listener/`
- `team-initial-distribution/`, `team-recovery/`, `team-vesting-monthly-push/`, `vesting-monthly-push/`

**New contracts** under `contracts/Contracts/`:
- `DeployTimelock.sol`, `IDIA.sol`, `IDIAEscrow.sol`, `IDIAFundingRound.sol`, `IDIAGovernor.sol`, `IDIAGovernorV3.sol`, `IDIALiabilityReceipt.sol`, `IDIAPoolDeployerModule.sol`, `IDIAPoolFactory.sol`, `IDIARegistry.sol`

**`src/services/walletService.ts`** — adds the SynapseVault approval flow:
- New `"approving_vault"` provisioning state + `vaultApproveTxHash` on the result type
- New `SYNAPSE_VAULT_ADDRESSES` mainnet constant (`0x7F46293d51Ca3264f060eFC92233b40A76130b4A`)
- Cosmetic edits (removes emojis from comments/logs, rewraps section dividers)

### Files I'll skip / reconcile (need your call)

| File | Branch state | Recommendation |
|---|---|---|
| `supabase/functions/relay-governance-action/index.ts` | Has merge conflict markers, hardcodes governor | **Skip** — keep our current version |
| `supabase/functions/governance-indexer/index.ts` | Different lineage than ours | **Skip** — keep our current version (has lifecycle archival) |
| `android/` directory | Full native Android scaffold | **Skip** — Capacitor generates this from `npx cap add android`; committing it into the repo would fight the build. Confirm if you actually want it tracked. |
| `.env` | Differs | **Skip** — never overwrite local env |
| `package-lock.json` | Differs | **Skip** — regenerated on install |
| `supabase/.temp/*` | Local CLI cache | **Skip** |

### Order of operations
1. Copy the 10 new edge function folders into `supabase/functions/`.
2. Copy the 10 new `.sol` files into `contracts/Contracts/`.
3. Overwrite `src/services/walletService.ts` with the branch version (SynapseVault approval flow).
4. Leave `relay-governance-action`, `governance-indexer`, `android/`, `.env`, and `package-lock.json` untouched.
5. Run typecheck / build afterward to verify nothing in the new edge functions imports something we don't have.

### Confirm before I proceed
- **OK to skip the two conflicted governance edge functions?** (Strongly recommended — the branch versions are broken/older.)
- **OK to skip the `android/` directory?** (Or do you want it committed?)
- **Anything else** in `merge/lovable-sync-2` you specifically want pulled that I've marked skip?
