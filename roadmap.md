# Roadmap

## Apple Health / Swift-Master handoff

- [x] Frontend `AppleHealthModal.tsx`: strip all direct network calls, hand off to `window.webkit.messageHandlers.syncHealthData`, wire `onHealthDataSyncComplete` / `onHealthDataSyncError` with Planck logs.
- [x] Edge function `apple-health-sync`: remove GET ping, strict POST (405 on other methods), 400 on missing `aca_hash_key` / data, `[EDGE_INIT|PROCESS|SUCCESS|CATCH_FATAL]` logs, 200 `{success:true}` on ingest.
- [x] Deploy + verify live: GET?ping=1 → 405, OPTIONS → 200, POST {} → 400, bogus ACA → 403.
- [ ] BLOCKED ON SWIFT: zero requests from the iOS shell reached `apple-health-sync` in the last 24h. The `syncHealthData` WKScriptMessageHandler in the installed build must be verified (handler registered on the `WKUserContentController`, and `sendBulkToUniversityHub` POSTing to the function URL with the `apikey` + `Authorization` headers).
