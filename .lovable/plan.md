## IDIA Life Connection Bridge

Goal: Wire the "Life" tab to the native iOS NFC hardware through a typed `useNFCBridge` hook, drive the Standing Orb's chromatic transition from the inbound peer signal, and keep a graceful web-only fallback. The existing light-themed `WelcomeSequence` already satisfies the onboarding/spotlight requirement and will be left untouched.

### What gets built

1. **New hook — `src/hooks/useNFCBridge.ts`**
   - `initiateSovereignHandshake(mode?: "STANDARD" | "PACE")` → posts to `window.webkit.messageHandlers.initiateNfcScan` with `{ action: "start_scan", mode }`. The optional `mode` param is the future-proof seam for the Vote tab's PACE/DAO verification — no UI for it yet.
   - Detects bridge availability (`window.webkit?.messageHandlers?.initiateNfcScan`). If absent, the hook returns `isBridgeAvailable: false` and `initiate…` resolves with a graceful no-op + toast: *"Please open IDIA Life on your mobile device to activate the physical handshake hardware."*
   - Installs global listeners on mount: `window.onNfcScanComplete = (peerToken) => …` and `window.onNfcScanError = (error) => …`. Cleans them up on unmount.
   - Internally re-broadcasts results as `CustomEvent`s (`nfc:scan-complete`, `nfc:scan-error`) so multiple components (Life now, Vote later) can subscribe without fighting over the singleton globals.
   - Paired logging on every entry/exit: `[BRIDGE_INIT_START/END]`, `[BRIDGE_LISTENER_INIT_START/END]`, `[BRIDGE_HANDSHAKE_START/END]`, `[BRIDGE_SCAN_COMPLETE]`, `[BRIDGE_SCAN_ERROR]`.

2. **LifeScreen integration — `src/components/enhanced/LifeScreen.tsx`**
   - Mount `useNFCBridge` at the top of the component.
   - Replace the existing nested `<NFCHandshake />` button with a primary **"Sync Standing"** CTA styled in the current Trust-Blue/Amber glossy aesthetic (gradient teal→amber, glass-box). Disabled state while a scan is in flight.
   - On `nfc:scan-complete`: derive the peer's tier color from the returned `peerToken` (placeholder mapper for now — the token shape is opaque pending native contract), then mount the existing `ColorWashOverlay` blending `myTierColor` ↔ `peerTierColor`. The Orb already re-renders against `profile?.trust_score`; the wash provides the cinematic transition.
   - On `nfc:scan-error`: non-technical toast ("Connection didn't complete. Try again with the phones held closer.").
   - Keep `NFCHandshake.tsx` in place but unused by Life (no deletion — referenced types/utility may be reused; safe to remove later once Vote tab is wired).

3. **Standing Orb chromatic response**
   - No change to `StandingOrb.tsx` itself — it already resolves color from `score`. The chromatic shift happens naturally when `profile.trust_score` updates after a handshake. The `ColorWashOverlay` handles the transition flourish. (If a peer-driven intermediate hue is desired before the score updates, we can pass a transient `overrideTier` prop in a follow-up — flagged but out of scope here.)

4. **Web-fallback UX**
   - When `isBridgeAvailable` is false, the "Sync Standing" button stays visible but tapping it triggers the graceful toast instead of posting to the missing bridge. No hard error, no console exception.

5. **Welcome / Spotlight sequence**
   - Already implemented in `src/components/life/WelcomeSequence.tsx` with the exact required copy, the spotlight effect over the bottom nav, the persistent Skip button, and `localStorage` first-launch gating in `MainApp.tsx`. No changes needed.

### Files touched

- **new** `src/hooks/useNFCBridge.ts`
- **edit** `src/components/enhanced/LifeScreen.tsx` (swap NFC button for Sync Standing CTA + bridge wiring + ColorWashOverlay subscription)

### Out of scope (called out)

- Native iOS Swift handler implementation — that lives in the Capacitor wrapper, not the web bundle.
- Real `peerToken` → tier resolution — needs the finalized native contract; a clearly-marked placeholder mapper ships now.
- Vote tab PACE integration — the `mode` parameter is reserved but no UI consumes it yet.
- Removing `NFCHandshake.tsx` — left in tree to avoid breaking any unseen imports.
