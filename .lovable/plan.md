## Problem

On the Life page, tapping **Start Syncing** opens the iOS NFC sheet and Apple reports a successful read, but the **Connections** tab never gains a new entry.

Root cause (verified in code):

- `useNFCBridge` correctly fires the `nfc:scan-complete` event with a peer token.
- `LifeScreen`'s handler (`src/components/enhanced/LifeScreen.tsx`, lines 104–129) only does cosmetic work: color wash, toast, then `setRateTarget(peerToken)` and `promptLabelForLatestSync()`.
- **No row is ever inserted into the `friends` table**, so `useSocialGraph` keeps returning the same list and the UI shows no new Connection.
- `promptLabelForLatestSync` then picks the most recent existing friend (or none), so the label/rate prompts target the wrong row.
- Secondary issue: the native `NFCManager` returns a raw NDEF payload string. To create a `friends` row we need the peer's Supabase `user_id`. The handshake payload must carry (or resolve to) that id.

## Plan

### 1. Define the on-tag payload contract
Standardize the NDEF record both devices write/read as a compact JSON envelope:
```
{ "v": 1, "uid": "<peer auth user_id uuid>", "sig": "<base64 ed25519 sig>", "ts": <unix> }
```
- `uid` → peer's Supabase auth user id.
- `sig` → signature over `uid|ts` using the device's enclave key (DELT-compatible, validated server-side).
- `ts` → freshness check (reject if >120s old).

No Native changes are required for *reading*; the existing `didDetectNDEFs` already forwards `scannedPayload` to JS. Writing the user's own tag is a follow-up (out of scope here — assumed already broadcast by peer).

### 2. New edge function `nfc-handshake-resolve`
`supabase/functions/nfc-handshake-resolve/index.ts`:
- Auth: requires the caller's JWT (anon key path; reads `auth.uid()` from the verified token).
- Body: `{ peerPayload: string | object, aca_hash: string }`.
- Steps:
  1. Parse envelope; reject malformed / stale / self-handshake.
  2. Verify `sig` (stub for now with TODO; structure ready for ed25519 verification once enclave pubkeys are registered).
  3. Generate / validate ACA hash (reuse `utils/acaGenerator` pattern server-side).
  4. Upsert into `public.friends` with `(user_id_1 = auth.uid(), user_id_2 = peer_uid, status = 'accepted', accepted_at = now())`. Use canonical ordering (smaller uuid first) so the unique constraint dedupes regardless of who tapped first.
  5. Return `{ friendshipId, peerUserId, aca_hash }`.
- Logs with `[NFC_RESOLVE_*]` markers per project convention.

### 3. Migration — friends table hardening
- Add unique index `(LEAST(user_id_1,user_id_2), GREATEST(user_id_1,user_id_2))` if not already present, so the upsert is idempotent.
- Confirm RLS allows a user to insert/select rows where they are either side. Add policy if missing.

### 4. Wire LifeScreen to the resolver
`src/components/enhanced/LifeScreen.tsx` `nfc:scan-complete` handler (lines 104–129):
- Call `supabase.functions.invoke('nfc-handshake-resolve', { body: { peerPayload: detail.peerToken, aca_hash } })`.
- On success:
  - `await reload()` from `useSocialGraph` so `friends` repopulates.
  - Use the returned `friendshipId` for `setRateTarget` and `setLabelTarget` (replaces the broken `promptLabelForLatestSync` heuristic).
  - Keep the color wash + toast.
- On failure: surface a toast with the resolver's error message; do not show a fake "Connection" success.

### 5. Verification
- Confirm the legacy `src/components/life/NFCHandshake.tsx` is unused on the Life page (LifeScreen now owns the bridge via `useNFCBridge`); leave it alone or delete in a follow-up.
- Manual test: simulate a `nfc:scan-complete` event from devtools with a valid envelope → friends list increments, label/rate sheets target the new row.

### Technical notes
- `friends` schema (verified): `id uuid`, `user_id_1 uuid NOT NULL`, `user_id_2 uuid NOT NULL`, `status text`, `created_at`, `accepted_at`.
- Edge function uses `SUPABASE_SERVICE_ROLE_KEY` internally to bypass RLS for the upsert, after verifying the caller JWT — matches existing edge function standards in memory.
- No PII written to public schema; only auth user uuids (already allowed).
- Out of scope: the native side writing the user's own tag, ed25519 enclave key registry — both stubbed with TODOs the resolver tolerates so the flow works end-to-end with the current payload, with signature verification a drop-in upgrade.
