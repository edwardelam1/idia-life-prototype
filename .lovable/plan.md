## Re-enable ACA simulation (temporary) — untagged payloads

Reverts the no-simulation guard. Payload shape stays identical to the original — no `simulation_mode` flag, no marker fields, nothing distinguishing simulated from real.

### Changes

**1. `src/utils/acaGenerator.ts`**
- Remove the `throw new Error("ACA_NATIVE_REQUIRED")` on web.
- On non-native, generate `hardware_attestation_id` the same way the original simulated version did: a random hex string + timestamp, indistinguishable in shape from the native value.
- Native path (Face ID / Touch ID + `Device.getId()`) stays exactly as it is.
- Payload keys unchanged: `platform_guid`, `source_id`, `timestamp`, `consent_scope`, `hardware_attestation_id`, `aca_hash_key`.

**2. `src/components/governance/ActiveProposalsList.tsx`**
- Remove the early "Native Device Required" toast that short-circuits voting on web. Let `generateACAHash` run.

**3. Memory**
- Update `mem://constraints/no-simulated-aca` and the matching Core line in `mem://index.md` to record that ACA simulation is currently **allowed** on web, payloads are untagged, restoration of strict mode is a future task.

### Not changing
- Payload schema or any consumer of `aca_payload`.
- Native biometric install, Info.plist, edge functions, DB.

Confirm and I'll implement.
