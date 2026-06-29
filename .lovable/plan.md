## Diagnosis (verified against the live database)

Pulled `dao_hats` rows for the three relevant users:

| Wallet | User | Active hats |
|---|---|---|
| `0x429F…5A40` (you) | `217c…7536` | `tophat` + all four committee hats |
| `0x6cC2…7545` (Shawn) | `9ac1…4a7e` | `tophat` only |
| `0x1767…b582` | `f60a…14d6` | `legal_defense` only |

Officer counts the UI currently shows (from `COUNT(*) FROM dao_hats WHERE revoked_at IS NULL GROUP BY hat_type`):

- `legal_defense` → **2** (you + 0x1767)
- `sociorelational` → **1** (you)
- `security_council` → **1** (you)
- `product_xr` → **1** (you)

So Shawn is not "missing" from any query — he genuinely has **no committee hat rows**, only a `tophat`. The UI already treats `tophat` as L3 universal authority for *the viewer* (`isActiveMember = userActiveHats.has(committee.id) || ascensionLevel === 3` in `CommitteesList.tsx`), but the **officer count and roster modal still count explicit hat rows only**, so other tophat holders never appear as officers of committees they don't hold an explicit hat for.

This is a presentation-layer inconsistency, not RLS / not a permissions bug. Confirmed: RLS on `dao_hats` is `Allow authenticated read access` with `qual = true`, and authenticated has SELECT — every authenticated session can see all hat rows.

## Fix (frontend-only)

Promote Protocol Stewards (`tophat` holders) to honorary officers of every committee in both the count badge and the roster modal.

### 1. `src/components/governance/CommitteesList.tsx` — `fetchLedgerState`

Build a set of tophat user IDs from the single `dao_hats` fetch (already returned), then add that set's size to every committee's count:

```ts
const tophatUserIds = new Set<string>();
hatsRes.data?.forEach((h: any) => {
  if (h.hat_type === "tophat" && h.eligibility_status === "active") {
    tophatUserIds.add(h.user_id);
  }
});

const counts: Record<string, number> = {};
hatsRes.data?.forEach((h: any) => {
  if (h.eligibility_status !== "active") return;
  if (h.hat_type === "tophat") return;             // counted separately below
  // Don't double-count a tophat holder who *also* has an explicit committee hat
  if (tophatUserIds.has(h.user_id)) return;
  counts[h.hat_type] = (counts[h.hat_type] || 0) + 1;
});

// Every tophat holder is an officer-of-record for every committee
COMMITTEES_META.forEach((c) => {
  counts[c.id] = (counts[c.id] || 0) + tophatUserIds.size;
});
```

Expected after fix: all four committees show **at least 2 Active Officers** (you + Shawn), `legal_defense` shows **3** (you + Shawn + 0x1767).

### 2. `src/components/governance/CommitteeRosterModal.tsx` — `load()`

Currently fetches `dao_hats WHERE hat_type = committee.id`. Extend to also union in active `tophat` holders so they render in every committee's roster, badged as **L3 · Protocol Steward (honorary)**:

- Fetch `tophat` holders alongside the committee's own hat holders.
- Merge into the `userIds` list (dedupe).
- For users present only via tophat, mark `level = 3`, `status = 'active'`, and skip the Promote/Demote buttons (tophat already outranks L2; the existing `isSelf` guard plus a new `isTophatOnly` guard cover this).
- Sort order: L3 → L2 → L1 → pending.

### 3. No backend / RLS / migration changes

- No schema change.
- No new GRANTs (`dao_hats` is already readable by `authenticated`).
- No edge-function change.
- No data write — we are not synthesizing committee hat rows for tophat holders; honorary status is computed in the view layer so revoking a tophat instantly removes the honorary listings.

## Out of scope

- Officer count for non-committee hats (`oversight_chair`, `tophat` themselves) — those aren't rendered as committee cards.
- Any change to `getAscensionLevel` / `governanceGate.ts`.
- ApplicationReviewQueue, AuditFeed, and other Delaware-portal panels — the user only flagged the committee membership count.

## Files touched

- `src/components/governance/CommitteesList.tsx` (officer-count derivation)
- `src/components/governance/CommitteeRosterModal.tsx` (roster union with tophat holders + honorary badge)
