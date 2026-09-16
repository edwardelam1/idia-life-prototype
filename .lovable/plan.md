# War chest and community pool routing: what the trace found

## Verified findings

All checks below were run against the live ledger and Base mainnet today.

**1. The community pools have never hydrated. Not once.**

Every single regional payout since May — all 64 rows, 4.95 USDC total — landed in the global war chest `0x0910…5d59`. The ledger records two reasons:

- `war_chest_null` — the sale arrived with no location at all (44 of 64 sales).
- `war_chest_fallback` — the sale had a location, pool creation was attempted, and it failed (20 of 64).

**2. Why creation fails: the relayer was never authorized on the Safe.**

Two locations have ever been sent: `Louisville-KY-US` (10 sales) and `Frankfort-KY-US` (10 sales). On chain, neither has a pool in the Registry or the Factory — both resolve to the zero address.

The pool-deployer module is enabled on the treasury Safe, and it is not paused, but `authorizedOperators(relayer)` reads **false**. So every deploy attempt reverts `NotAuthorized`, and the money falls back to the war chest. This is the exact "ACTIVATION REQUIRED" one-time Safe transaction noted in the settlement code, which has never been executed.

**3. "Kicked back" is literally true.**

The war chest address `0x0910…5d59` *is* the treasury Safe — the same Safe that owns the pool factory and would own every pool. So regional funds intended for a jurisdiction return to the central treasury. That is the behaviour you are seeing.

**4. A second, worse problem sits behind the first.**

`IDIA_LocalizedPool` is hard-wired to the **IDIA token only**. Its spend function, balance view, and emergency withdrawal all operate on `idiaToken`. Settlement sends the regional leg in **USDC**. If the operator were authorized today, pools would deploy and USDC would be transferred into contracts that have **no way to ever move USDC out** — not even the emergency valve. Every regional payout would be permanently locked.

So authorizing the operator without fixing the token mismatch would turn a recoverable problem into an unrecoverable one.

**5. The corporate/war-chest transfer fix from earlier is confirmed working.** Cash register rose 3.075 → 3.975 USDC and the war chest 8.075 → 8.225 USDC on the 13:16 sale. Real transfers now land.

## What I propose

**Step 1 — Freeze regional pool routing (immediate, code only).**

Until pools can hold USDC, force the regional leg to the war chest deliberately rather than by accident: skip the deploy attempt, record routing mode `pool_routing_disabled`, and log the location that *would* have received it. This keeps funds recoverable and makes the backlog auditable. No behavioural change to where money goes today — it removes wasted gas on reverting deploys and stops the silent fallback.

**Step 2 — Decide the pool's asset, then make it real.**

Two options, your call:

- **A. USDC pools.** Deploy a revised pool contract that holds USDC (or any ERC-20, with the asset set at construction). Requires a new contract, a new factory deployment, and the Registry pointed at it.
- **B. IDIA pools.** Keep the existing contract and convert the regional 10% from USDC to IDIA before it is sent, the same way contributor IDIA royalties are already awarded through the escrow. No new contract.

**Step 3 — Authorize the operator (one Safe transaction, by you).**

Once Step 2 lands: execute `authorizeOperator(0xd816…31a7)` on the pool-deployer module from the Safe. I cannot do this — it needs the multisig. After that, located sales deploy and hydrate their own pool automatically.

**Step 4 — Backfill the jurisdictions.**

Of the 4.95 USDC of regional funds in the war chest, 1.50 USDC belongs to Louisville and Frankfort (20 located sales); the rest had no location and correctly belongs to the global chest. Once pools exist, move that 1.50 USDC from the Safe to the two pools, recorded as catch-up ledger rows. This is a Safe transaction, not an automated one.

**Step 5 — Chase the missing location data.**

44 of 64 sales carried no location, so their regional share can never reach a jurisdiction. That is a Hub-side payload question: whether the Hub should always attach a location to a sale. Flagging it, not fixing it here.

## Technical detail

- Edge function: `supabase/functions/idia-circular-settlement/index.ts`, Phase 2 regional block (lines ~619-760). Step 1 touches only the routing branch; the split percentages, contributor resolution, corporate leg and proof-of-payment assertions stay untouched.
- On-chain reads used: module `0x8AF7C97B56282DF3Af8f9472a9938b0D6b33Bf09` (`authorizedOperators` false, `paused` false, `safe` = `0x0910…5d59`, `poolFactory` = `0x0188fcB0…67bB`), Safe `isModuleEnabled(module)` true, Registry `0x137D913d…5387B` and factory `deployedPools` both zero for the two locations.
- No contract, key, or split changes in Step 1. Steps 2-4 require either a contract deployment or Safe transactions.
