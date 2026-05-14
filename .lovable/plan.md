# Welcome Manual Gating + Download Affordance

## 1. Asset
- PDF copied to `public/legal/IDIA_Data_DUNA_Welcome_Manual.pdf` (served at `/legal/IDIA_Data_DUNA_Welcome_Manual.pdf`).

## 2. First-visit gate on Vote page
Create `src/components/governance/WelcomeManualGate.tsx`:
- Modal styled like `TermsOfService.tsx` (same backdrop, card, scroll-to-bottom-to-enable pattern, teal/orange accent matching `GovernanceScreen` IDIA card).
- Embeds the PDF via `<object>`/`<iframe>` from `/legal/IDIA_Data_DUNA_Welcome_Manual.pdf`.
- "I Understand" button enabled after scrolling to bottom.
- Download link in footer (same `Download PDF Copy` pattern as ToS).

**Persistence (Zero-PII compliant):**
- On acknowledgement, write a `device_events` row (`event_type: 'duna_welcome_ack'`, `json_payload: { document, version: 'v1', aca }`) and generate an ACA hash via `generateACAHash(user.id, 'DUNA_WELCOME_V1', ['MANUAL_REVIEW'])` — mirrors ToS flow, satisfies DELT Protocol.
- Mark in `auth.users.user_metadata` (`duna_welcome_ack_at`, `duna_welcome_version: 'v1'`) so check is device-agnostic and stays out of `public` schema.
- Gate check inside `GovernanceScreen` `useEffect`: if `user.user_metadata?.duna_welcome_ack_at` missing → render `<WelcomeManualGate />` overlay; once acknowledged → hide.

## 3. Always-available download button
Refactor `HatsWardrobe.tsx` header row:
- Current header: `<h3>Hats Wardrobe · Role Authority</h3>`.
- Wrap in `flex justify-between items-center` and add a right-aligned `<a href="/legal/IDIA_Data_DUNA_Welcome_Manual.pdf" download>` styled as a small ghost pill: rounded, teal-700 text, `FileText` icon (lucide), `text-[9px] font-black uppercase tracking-widest`, hover `bg-teal-50`.
- Label: "Manual" with download icon — concise to fit one line on 375px viewport.
- Tooltip/title: "Download IDIA DUNA Welcome Manual".

No changes to wardrobe scroll list itself.

## 4. Files touched
- new: `public/legal/IDIA_Data_DUNA_Welcome_Manual.pdf` (done)
- new: `src/components/governance/WelcomeManualGate.tsx`
- edit: `src/components/governance/HatsWardrobe.tsx` (header row only)
- edit: `src/components/GovernanceScreen.tsx` (mount gate + acknowledgement state)

## Technical notes
- Reuses existing `acaGenerator` + `device_events` + `user_aca_records` tables — no migration needed.
- No new RLS policies; writes go through existing patterns.
- Matches existing UX language ("Sovereign", uppercase tracking, teal/orange palette, glassmorphism backdrop).
