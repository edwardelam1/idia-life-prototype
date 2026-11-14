# Roadmap

- [ ] Clear the failed Terms device-test claim and deploy safe Apple rejection-reason logging; verify reset and sender tests.
- [x] Save Apple settings securely, deploy direct APNs sender, and add automatic signed-in iPhone token registration with checked scoped saves.
- [x] Prepare the Terms campaign with protected administration, opt-in checks, duplicate prevention, and five passing sender-rule tests.
- [ ] Test the Terms notification on one real iPhone, confirm display/opening, then send production broadcast after approval — no authenticated administrator session available here; device confirmation required.
- [ ] Verify Swift AppDelegate and app entry notification registration/presentation/taps — these files were not included in the upload.
- [x] Review supplied ContentView without compiling or changing Apple Health; required updates documented in Native/iOS-notification-review.md.

- [x] Add mandatory consent pop-up using existing Terms and Authority of Record screens; block root, deep links, and foreground returns until completion.
- [x] Verify saved-consent and ordering rules with seven passing tests; verify document scrolling and acceptance control on desktop/mobile with no runtime errors.
- [ ] Verify signed-in consent save/read-back, Escape/backdrop protection, and real iOS/Android return-to-app flow — external unmanaged authentication prevents authenticated browser checks; native devices also required.

- [x] Match royalties pop-up to Welcome to Life; video-only enlargement, X/Escape return, and focus/playback continuity verified in browser.
- [ ] Verify royalties MP4 autoplay and expansion on real iPhone — needs a device attempt; local Chromium checks used a transcoded copy of the same recording.

- [x] Fix Apple Health connect: send real selected data types to native bridge (React)
- [x] Reuse existing ACA hash instead of minting per tap (React + DB)
- [x] Seed inactive apple_health row in data_connections for realtime/poll watchers
- [x] 30s bounded connect timeout with readable error state
- [x] Seed/repair data_connections row for affected profile (user_id = 217c6224-d839-43b0-98cb-b4d1be267536)
- [x] Biometric consent deadlock fix: 60s timeout + dual-channel result (events + global callback) in acaGenerator
- [x] Safety net survives timeout/error, re-checks on foreground return, reconciles only on last_sync_at from this attempt
- [x] DataDashboard: connected requires is_active=true; modal disconnect now deletes row (single path)
- [x] Reveal Life in the menu and onboarding spotlight; keep Shop gated until 2026-12-31
- [ ] Verify via hardware-only iPhone connect (no synthetic requests) — needs your device attempt
- [x] Apple Health: fresh ACA every attempt (Face ID always), 2s auto-close on success, 120s ingest watchdog
- [x] Biometric prompt isolation in acaGenerator (per-request token; stale Ford prompt can no longer swallow a Face ID result)
- [x] Ford path: canonical "ford" source id, pending row seeded, native shell navigates in place (no detached window / confirm())
- [x] Protocol rule: no upserts anywhere — explicit UPDATE-then-INSERT only (modal, data source screen, ford-oauth-callback)
- [x] Apple Health: activate only on confirmed native read; inactive seed, denial hard-fail, deactivation cleanup
- [x] Ford OAuth server flow: correct FordConnect Query authorization/token/data endpoints and one-time state validation
- [x] Ford callback: remove all HTML fallback/return pages and redirect directly to the native app
- [ ] Verify Ford sign-in and first telemetry pull on a real iPhone — needs your device attempt
- [x] Gov: Basescan opens in the native in-app browser surface (custom iOS shell or Android Capacitor; no blocked iframe)
- [x] Gov: first visit auto-opens the read-only DUNA manual with confetti bursts on both sides
- [x] Gov: keep the Welcome Manual frame below the fixed header and iPhone safe area
- [x] Wallet: show Synapse credit purchases with credits, USDC price, wallet, transaction hash, and Base block
- [x] Wallet: authorization card only requires the relayer approval (vault approval optional); hidden when status is unknown
- [x] Hub hand-off: Life answers idialife://authorize-relayer, authorizes the existing wallet, returns to the Hub with a status
- [x] Wallet history: hide 60% corporate allocations and show Synapse consumption as signed CR deductions
- [x] Data screen: frameless infinite carousels for alphabetized available sources and active streams
- [x] All data sources refresh every 6 hours: `data-source-refresh` sweep + `data-source-refresh-6h` cron (Nest, Ford, Strava pulled server-side; phone sources asked to wake)
- [x] Strava: real scheduled pull (token refresh + activities since last sync) instead of webhook-only
- [ ] Push delivery for Apple Health / Health Connect wake-ups — needs an FCM service account secret and registered device tokens

- [x] Connected sources refresh on app wake (mount, foreground, iOS/Android shells) with a 5-minute cooldown and a manual Refresh control
- [x] Every wallet (created or imported) gets its gas drip; drip errors shown instead of "Waiting for gas"
- [x] Gov Basescan links use the iOS shell openExternalLink sheet
- [x] Life map phase 1: one handcrafted vector terrain and mathematically continuous road with shared stop coordinates
- [ ] Life map phase 2: build one challenge clearing and bubble style after phase 1 visual approval
