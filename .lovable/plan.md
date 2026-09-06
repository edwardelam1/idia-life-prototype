# Fix the Ford connect path + restore fresh biometrics on Apple Health

## What I found (verified in the code)

**Ford is not going through the Ford screen at all.**
`FordConnectionModal.tsx` exists but is never opened anywhere in the app. Every Ford
attempt actually runs through the generic data-source screen (`DataSourceModal.tsx`),
which does something different:

- It asks for Face ID, writes a consent record, then opens the Ford login in a **new
  window** (`window.open(..., "_blank")`). Inside the iOS app shell that new window is a
  detached web view that never reports back.
- It then immediately shows "connected" and closes itself after 2 seconds — but it
  `return`s **before** writing the Ford row into your connections table. So Ford appears
  to connect and nothing is ever recorded.
- Its consent record uses a plain insert (no conflict handling) with a source name derived
  from the card title, so it can differ from the `ford` name the Ford callback function
  writes.

**Why this poisoned Apple Health.** The shared biometric helper (`acaGenerator.ts`)
temporarily replaces the global handler the iOS shell calls with the Face ID result, and
restores the previous one only when its own prompt resolves (up to 60 seconds). An
abandoned Ford attempt leaves that swap in place, so the next Face ID result — the Apple
Health one — is delivered to the stale Ford handler and dropped. That is the spinner.

## What I will change

### 1. Ford path
- Route Ford through the real `FordConnectionModal` from the data screen so there is one
  Ford flow, and remove the Ford branch from the generic data-source screen.
- Inside the Ford modal, detect the iOS shell: instead of `window.open` + `confirm()`
  (both of which stall a web view), navigate to the Ford login in the same view and return
  through the existing callback function; keep the popup flow for desktop browsers.
- Write the Ford connections row (`connection_type: "ford"`, inactive) before handing off,
  and let the OAuth callback flip it active; keep polling/refresh on return to foreground.
- Consent record becomes an upsert keyed on the consent hash with the fixed source name
  `ford`, matching what the callback function already writes.

### 2. Biometric handler isolation (fixes the cross-contamination)
- Give each biometric request its own token, ignore results whose token does not match,
  and always restore the previous global handler even when the prompt is abandoned or the
  app is backgrounded, so a stale Ford prompt can never swallow an Apple Health result.

### 3. Apple Health screen — your pasted version
Applied exactly as specified:
- **Fresh consent every time.** The "reuse an existing anchor" lookup is deleted; every
  connect attempt calls the biometric generator, so Face ID prompts every time.
- **Auto-close on success.** On the native success callback the connections row is flipped
  active, the "Data Anchored!" state flashes, and the screen closes itself after 2 seconds.
- **120-second ingest window.** Phase 1 (consent) stays at 45s; phase 2 (device fetch +
  ingest) moves to 120s so large historical payloads can land.
- Keeps the requested-metrics map plus array, the realtime + 3.5s polling safety net, the
  foreground reconciliation, and the disconnect teardown.

No Swift and no edge-function changes. Verification is your iPhone only — no synthetic
calls from my side.

## Files touched
- `src/components/DataSourceModal.tsx` (remove Ford branch)
- `src/components/DataDashboard.tsx` (open the Ford modal)
- `src/components/FordConnectionModal.tsx` (shell-safe flow, row seeding, ACA upsert)
- `src/utils/acaGenerator.ts` (per-request token, guaranteed handler restore)
- `src/components/AppleHealthModal.tsx` (fresh ACA, 2s auto-close, 120s watchdog)
