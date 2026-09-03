# Diagnose Apple Health Anchoring From Hardware Only

## Goal
Resolve the Apple Health modal’s indefinite “Anchoring cryptographic proof” state without synthetic requests and without changing React code.

## Verified current state
- The latest `apple-health-sync` logs contain no invocation from the iPhone attempt at approximately 16:10 UTC.
- The prior 16:06 entries were synthetic checks and will be excluded from diagnosis.
- Because the hardware request never reached the function, the present failure is upstream of the edge-function handler; changing response or insert logic cannot fix that specific no-request condition.
- The web/native contract currently dispatches `syncHealthData` with the endpoint, user ID, auth token, ACA hash, session ID, action, and requested data types.

## Plan
1. Use only a fresh connection attempt initiated from the user’s iPhone as the test event; record its exact UTC time and correlate only logs after that time.
2. Inspect `apple-health-sync` logs for the first hardware-originated `[BEGIN: Edge.Execution]` marker:
   - If absent, report the confirmed native transport/bridge boundary failure rather than altering the edge function blindly.
   - If present, follow its request ID through parse, ACA verification, status upsert, acknowledgement, and background insert markers.
3. If the hardware call reaches the function and fails there, make the smallest edge-function-only correction supported by that exact request’s logs, preserving JSON/CORS responses and DELT validation.
4. Have the user retry from the iPhone and verify success only from that hardware-generated request, its matching request ID, and the resulting staged health row/status update.
5. Do not use ping requests, fabricated payloads, curl calls, browser invocations, or any other synthetic edge-function validation.

## Constraint
If the next hardware attempt again generates no edge-function log entry, the edge function cannot repair a request that never arrives. The next required change would be in the native iOS `syncHealthData` transport, which is outside the currently requested edge-function-only scope and would be surfaced explicitly before any implementation.
