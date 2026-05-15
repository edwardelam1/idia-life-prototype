## Problem

Tapping **Start Syncing** on Life triggers a successful Apple NFC read, but no row is inserted into `friends`, so the Connections list never updates. `LifeScreen`'s `nfc:scan-complete` handler only does cosmetic work (color wash, toast, label/rate prompt) and never persists the handshake.

## Plan

### 1. New edge function — `nfc-handshake-resolve`
`supabase/functions/nfc-handshake-resolve/index.ts`:
- Verifies caller JWT → `auth.uid()` (anon-key client built from the `Authorization` header).
- Body: `{ peerPayload: string | object, aca_hash?: string }`.
- Parses the peer payload as either:
  - JSON envelope `{ v, uid, sig?, ts? }` (preferred, future-proof for ed25519 sig verification — stubbed with TODO).
  - Or a raw uuid string (current native bridge fallback).
- Rejects: malformed payload, self-handshake, `ts` older than 120s when present.
- Generates / validates an ACA hash server-side (mirrors `utils/acaGenerator`) per DELT protocol.
- Canonical-orders the pair (smaller uuid → `user_id_1`) and **upserts** into `public.friends` with `status='accepted'`, `accepted_at = now()`. Idempotent against the existing `friends_pair_idx` (and the future unique variant).
- Returns `{ friendshipId, peerUserId, aca_hash, created: boolean }`.
- Logs with `[NFC_RESOLVE_*]` markers.
- Uses `SUPABASE_SERVICE_ROLE_KEY` internally for the upsert after JWT verification (matches edge-function standards memory).

### 2. Wire `LifeScreen` to the resolver
In `src/components/enhanced/LifeScreen.tsx` `nfc:scan-complete` handler (lines ~104–129):
- Call `supabase.functions.invoke('nfc-handshake-resolve', { body: { peerPayload: detail.raw ?? detail.peerToken, aca_hash } })`.
- On success:
  - `await reload()` from `useSocialGraph` so the Connections tab repopulates.
  - Use returned `friendshipId` for `setRateTarget` and `setLabelTarget` — replaces the broken `promptLabelForLatestSync` heuristic that picks the most recent existing row.
  - Keep the color wash + success toast.
- On failure: error toast with the resolver's message, no fake success state.

### 3. Verification
- Manually dispatch a `nfc:scan-complete` CustomEvent from devtools with a valid uuid envelope → confirm a row appears in `friends`, `useSocialGraph.reload()` populates Connections, and the label/rate sheets target the new row.
- Re-tap same peer → no duplicate (existing `friends_pair_idx` makes the upsert clean; future unique flip is a no-op for this code path).
- Check `[NFC_RESOLVE_*]` logs in Supabase Edge Function logs.

### Technical notes
- No DB migration needed — `friends_pair_idx` is already in place; uniqueness intentionally deferred until after Apple review.
- No PII written to public schema; only auth uuids.
- Native side writing the device's own NDEF tag and ed25519 signature verification are out of scope; the resolver tolerates the current raw-uuid payload via the fallback parser, with the JSON envelope path ready for the signed upgrade.
- Legacy `src/components/life/NFCHandshake.tsx` is unused on the Life page (LifeScreen owns the bridge via `useNFCBridge`); leave as-is.
