# Witness-only Good Deeds

## What changes for people
- The "Submit a Good Deed" window gets a new required section: **"Who did the Good Deed?"** — a list of your accepted Connections (shown with the names you saved on this device, or their anonymous handle).
- You can no longer submit a deed about yourself. You are always the **witness**; the chosen Connection is the **doer**.
- If you have no Connections yet, the section explains you need to make a Connection first and the Submit button stays off.
- The Good Deeds list shows deeds you witnessed ("You witnessed …") and deeds others witnessed about you ("Witnessed by a Connection").

## Who gets what
- **Doer** (the Connection): receives the trust-score boost when the deed is verified.
- **Witness** (submitter): Life challenge 3 ("submit a good deed") completes when a deed they witnessed is verified.

## Enforcement (cannot be bypassed from the app)
- Database: new `doer_id` column on Good Deeds; a rule rejects any deed where doer = submitter, and rejects a doer who is not an accepted Connection of the submitter.
- Verification step re-checks the same rules before approving, and credits the trust boost to the doer instead of the submitter.
- Older deeds with no doer stay as history; they are not deleted.

## Technical details
- Migration: `ALTER TABLE good_deeds ADD COLUMN doer_id uuid`; validation trigger (BEFORE INSERT/UPDATE) raising on `doer_id IS NULL` for new rows, `doer_id = user_id`, or no accepted `friends` row for the pair. Add SELECT policy so doers can read deeds about them (existing "view" policy already allows reads).
- `LifeScreen.tsx`: connection picker (accepted `friends` → other user id, labels via `localPIIVault.lookupBatch`), insert includes `doer_id`; list labels witness/doer. No names stored in the database (Zero-PII).
- `verify-good-deed-evidence`: validate `doer_id` present, ≠ submitter, accepted friendship; apply trust update to `doer_id`.
- `useLifeChallengeProgress`: unchanged query (submitter `user_id` + verified) — still means "witnessed and verified".
- `useSocialGraph`: also load deeds where `doer_id = me`.
