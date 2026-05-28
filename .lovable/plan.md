## Fix: Conditional Attest/Restore Button Visibility in HatsWardrobe

### Problem
The HatsWardrobe component currently renders an "Attest" button on **every** active hat, and a "Restore" button on every grayed hat. The user wants the button to appear **only when re-attestation is actually needed**.

### Root Cause
The eligibility sweep (`dao-hat-eligibility` edge function) transitions hats:
- `active` → `grayed` after **365 days** without attestation
- `grayed` → `severed` after **395 days** without attestation

Currently the UI shows the "Attest" button for all `active` hats regardless of how recently they were attested, creating noise for fresh hats.

### Changes

1. **Update query in `HatsWardrobe.tsx`**
   - Expand the `select()` to include `last_attested_at` and `granted_at` so the component can compute hat age.

2. **Add `needsAttestation()` helper**
   - `grayed` → always `true` (Restore is always applicable)
   - `active` → `true` only when the hat is within **30 days of the 365-day gray threshold** (i.e. `ageDays > 335`). Otherwise hide.
   - `severed` / `pending_veto` → `false`

3. **Update `Hat` interface**
   - Add `last_attested_at?: string` and `granted_at?: string` fields.

4. **Conditionally render button**
   - Change the existing `wearer && (active || grayed)` guard to `wearer && needsAttention(...)` so the button only renders when applicable.

### Files Modified
- `src/components/governance/HatsWardrobe.tsx` — query expansion, helper, conditional render

### Acceptance Criteria
- Freshly granted / recently attested active hats do NOT show an "Attest" button.
- Active hats approaching the 365-day threshold (>335 days since last attestation) DO show "Attest".
- Grayed hats always show "Restore".
- No UI or behavior changes for severed / unowned hat slots.