## Problem

Pressing **Veto** on `PendingActionsCarousel` shows the "Mobile Device Required — Secure Enclave attestation..." toast on iPhone, even though other ACA + biometric features (approve, sponsor, reject, promote, extend, etc.) work fine on the same device.

## Root cause

`castVeto` in `src/components/governance/PendingActionsCarousel.tsx` guards the flow with `isNative()` from `src/services/platform.ts`, which returns `Capacitor.isNativePlatform()`. The iOS shell is a **pure WKWebView wrapper** using a custom bridge (`window.webkit.messageHandlers.triggerBiologicalCapture`), not a Capacitor runtime — so `Capacitor.isNativePlatform()` is `false` and the veto is blocked before the bridge is ever called.

`generateACAHash` (used by every working ACA flow) correctly detects native by probing `window.webkit.messageHandlers.triggerBiologicalCapture`. Veto is the only touchpoint using the wrong signal.

## Fix

In `src/components/governance/PendingActionsCarousel.tsx`:

1. Remove the `isNative()` import + pre-flight guard on `castVeto`.
2. Replace it with the same detection `generateACAHash` uses — probe `window.webkit.messageHandlers.triggerBiologicalCapture`. If missing (i.e. web preview), show the existing "Mobile Device Required" toast; otherwise proceed.
3. Preserve the existing error path: `generateACAHash` already surfaces a proper toast when the enclave handshake is rejected, so no behavior change on real failures.

No edge-function or DB changes needed — the veto insert and `dao-veto-tally` invocation already succeed once the ACA hash is produced.

## Verification

- On iPhone (WKWebView shell): Veto button now triggers Face ID / Touch ID, writes to `dao_vetoes`, and calls `dao-veto-tally`.
- In Lovable web preview: still blocked with the "Mobile Device Required" toast (unchanged).
- Other ACA flows: untouched.