## IDIA Life Tab — Six-Feature Upgrade

All work stays inside the existing Glossy Light Theme (teal-50/100/600, orange/amber gradient, white cards, rounded-xl, shadow-sm). No new colors. No contractions. Fifth-grade reading level. Strict adherence to the Zero-PII core rule (PII never enters Supabase public schema).

---

### Phase 1 — Terminology + "Start Syncing" Button (Foundation)

**Files:** `src/components/enhanced/LifeScreen.tsx`

- Rename every NFC button label to **"Start Syncing"**.
- Replace "Connections" tab subtitle and all friend-list copy with the words **Syncing** (action) and **Connection** (person).
- Rewrite microcopy in plain fifth-grade language, no contractions:
  - "Tap two phones together to start Syncing."
  - "A successful Sync makes a new Connection."
  - "You cannot add a Connection by searching. You must Sync in person."
- Wrap the entry point with `console.log("[SYNCING_TERMINOLOGY_INIT_START]")` / `_END` in a `useEffect`.

---

### Phase 2 — Swipe-to-Rate Overlay

**New file:** `src/components/life/SwipeToRate.tsx`
**Edits:** `src/components/enhanced/LifeScreen.tsx`, new edge function `supabase/functions/submit-connection-rating/index.ts`

- Full-screen white overlay (matches existing `ColorWashOverlay` z-index pattern, teal-50 background, rounded-xl modal).
- Five large star icons (lucide `Star`) in a horizontal row. As the finger drags across them, stars fill teal/amber gradient up to the touch point.
- Haptics via Capacitor `@capacitor/haptics` (already a Capacitor project):
  - 1–4 stars: `Haptics.impact({ style: ImpactStyle.Light })` — the "tick".
  - 5 stars: `Haptics.impact({ style: ImpactStyle.Heavy })` — the "thud".
  - Web fallback: `navigator.vibrate(20)` / `navigator.vibrate(80)`.
- Fires automatically after every successful `nfc:scan-complete` event.
- Reachable on demand from the Connections list via a "Rate" button on each row — opens the same overlay so the user may **update** their rating any time (not one-time).
- On submit, calls edge function `submit-connection-rating` with `{ connection_id, stars }`. The edge function:
  - Inserts a row into a new `connection_ratings` table (anonymous IDs only, never names).
  - Recomputes the rated user's `profiles.trust_score` delta and forwards it to the IDIA Protocol (existing `calculate-trust-score` function).
- Logs: `[HAPTIC_SWIPE_INIT_START/END]` on overlay mount/unmount.

**New table (migration):**
```
connection_ratings (
  id uuid pk, rater_id uuid, ratee_id uuid,
  stars int check 1..5, created_at timestamptz default now()
)
```
RLS: insert/select where `auth.uid() = rater_id`; ratee can only see aggregate via security-definer function.

---

### Phase 3 — Sphere of Influence (Trust Circles tab)

**New files:**
- `src/components/life/PulseMap.tsx`
- `src/components/life/TrendChart.tsx`

**Edits:** `src/components/enhanced/LifeScreen.tsx` (Trust Circles tab body)

- Toggle pill at top of the tab using existing `Tabs` style with two options: **Pulse Map** | **Trend Chart**.
- **Pulse Map**: dark-teal background card (re-using `bg-teal-900/90` only inside this map — does NOT change global theme), each Connection rendered as a glowing dot positioned by stable hash of their anonymous ID. When a `connection_ratings` row arrives (Supabase Realtime channel on `connection_ratings`), the matching dot pulses for 2.5s. Pulse hue uses the existing `tierColorForScore()` function already in `LifeScreen.tsx`.
- **Trend Chart**: uses already-installed `recharts` library. Line chart of the user's own `trust_score` daily snapshots over the last 30 days from a new `trust_score_history` table (insert a row via trigger on `profiles.trust_score` update).
- Logs: `[SPHERE_MAP_LOAD_START/END]` paired in `useEffect`.

**New table (migration):**
```
trust_score_history (id uuid pk, user_id uuid, score int, recorded_at timestamptz default now())
```
RLS: select where `auth.uid() = user_id`.

---

### Phase 4 — PII Shield (Local Name Vault)

**New file:** `src/lib/localPIIVault.ts`

- Tiny IndexedDB wrapper (no external dep) keyed by anonymous `connection_id` → `{ first_name, last_name, nickname }`.
- All Connection list rendering routes through `vault.lookup(id)` before display. If the device has no local mapping, the UI shows the anonymous ID's initials inside a teal Avatar (current pattern).
- After a successful Sync, prompt the user **on-device only** to label the new Connection. The label is written to IndexedDB. Nothing is sent to Supabase.
- The friends table continues to store only `user_id_1` / `user_id_2` UUIDs (already PII-free — confirmed via schema check).
- Logs: `[LOCAL_PII_MATCH_START/END]` around every lookup batch.

---

### Phase 5 — Evidence-Based Good Deeds

**Edits:** `src/components/enhanced/LifeScreen.tsx` (Good Deeds tab dialog), new edge function `supabase/functions/verify-good-deed-evidence/index.ts`, new storage bucket `deed-evidence`.

- Dialog adds a required file `<Input type="file" accept="image/*,video/*,audio/*">` plus the existing description `<Textarea>`.
- Submit button is `disabled` unless **both** a file is selected and the description is non-empty (trim length > 0).
- On submit:
  1. Upload file to `deed-evidence` bucket at path `{user_id}/{deed_id}.{ext}`.
  2. Insert good_deed row with `evidence_url`.
  3. Invoke edge function `verify-good-deed-evidence` which calls the existing Friend AI (Lovable AI Gateway) with the file + description; on `accept`, updates `verification_status='verified'` and bumps the ratee's trust_score.
- New storage bucket `deed-evidence` (private, RLS: insert/select where path starts with `auth.uid()`).
- Logs: `[GOOD_DEED_SUBMISSION_START/END]` around submit handler.

---

### Phase 6 — Proximity Awareness Overlay

**New file:** `src/components/life/ProximityAlert.tsx`
**Edits:** `src/components/enhanced/LifeScreen.tsx` (mount near top of Overview tab)

- On mount, requests `navigator.geolocation` with low accuracy. If denied, the component renders nothing.
- New edge function `nearby-high-standing` returns anonymous IDs of users within ~250m whose `trust_score ≥ 660` (Distinguished and above), excluding self. **No names, no exact coordinates** are returned — just an opaque count + the highest tier hue.
- Renders a small white card pinned to the top of the Overview tab (existing `Card` style, teal-100 border, shadow-sm) with the exact copy:
  > "A person with high standing is nearby. You should connect to grow your truth."
- Card includes a subtle pulsing teal dot (matches Pulse Map dot styling).
- Auto-hides after 30 seconds or on dismiss.

---

### Phase 7 — Final Sweep

- Grep the Life tab for contractions (`don't`, `can't`, `won't`, `it's`, `you're`) and replace with full forms.
- Verify all new copy reads at fifth-grade level (short sentences, common words).
- Confirm no new colors were introduced — only existing `teal-*`, `orange-*`, `amber-*`, `emerald-*`, `white`, `muted-foreground` tokens.
- Run the build and address any TS errors.

---

### Technical Notes

- **Realtime** for the Pulse Map uses `supabase.channel('connection_ratings').on('postgres_changes', …)`.
- **Haptics** import: `import { Haptics, ImpactStyle } from '@capacitor/haptics'` — package already pulls in cleanly because Capacitor is configured (`capacitor.config.ts` exists).
- **No PII in cloud**: confirmed `friends`, `good_deeds`, `social_health_metrics` schemas already store only UUIDs and numeric values — Phase 4 simply enforces the rule on the client side too.
- **Edge functions** added: `submit-connection-rating`, `verify-good-deed-evidence`, `nearby-high-standing`. All use `verify_jwt = false` + in-code JWT validation per project standard, pass `SERVICE_ROLE_KEY` in Auth header, and generate an ACA hash on egress per the DELT Protocol core rule.
- **Migrations** added: `connection_ratings`, `trust_score_history`, `deed-evidence` storage bucket + RLS.

Approve and I will implement all seven phases in order, deploying edge functions and verifying the build at each step.