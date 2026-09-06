# Roadmap

- [x] Fix Apple Health connect: send real selected data types to native bridge (React)
- [x] Reuse existing ACA hash instead of minting per tap (React + DB)
- [x] Seed inactive apple_health row in data_connections for realtime/poll watchers
- [x] 30s bounded connect timeout with readable error state
- [x] Seed/repair data_connections row for affected profile (user_id = 217c6224-d839-43b0-98cb-b4d1be267536)
- [x] Biometric consent deadlock fix: 60s timeout + dual-channel result (events + global callback) in acaGenerator
- [x] Safety net survives timeout/error, re-checks on foreground return, reconciles only on last_sync_at from this attempt
- [x] DataDashboard: connected requires is_active=true; modal disconnect now deletes row (single path)
- [x] Hide Life & Shop tabs + spotlight tour until 2026-12-31 (release.ts date + WelcomeSequence gate; Pro stays visible)
- [ ] Verify via hardware-only iPhone connect (no synthetic requests) — needs your device attempt
- [x] Apple Health: fresh ACA every attempt (Face ID always), 2s auto-close on success, 120s ingest watchdog
- [x] Biometric prompt isolation in acaGenerator (per-request token; stale Ford prompt can no longer swallow a Face ID result)
- [x] Ford path: canonical "ford" source id, pending row seeded, native shell navigates in place (no detached window / confirm())
- [x] Protocol rule: no upserts anywhere — explicit UPDATE-then-INSERT only (modal, data source screen, ford-oauth-callback)
