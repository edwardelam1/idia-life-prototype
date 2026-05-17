# Why ACA is failing on Apple Health connect

There are two distinct failures, both produced by `src/utils/acaGenerator.ts`.

## Failure 1 — In the Lovable web preview (what you're looking at right now)

`generateACAHash` is hard-coded to refuse on any non-native runtime:

```ts
} else {
  console.error("[ACA_HARDWARE] REFUSED: Native Secure Enclave required…");
  throw new Error("ACA_NATIVE_REQUIRED");
}
```

This is **by design** (per the "No Simulated ACA" rule in project memory). The web preview has no Secure Enclave, so Apple Health connection from the browser will always throw `ACA_NATIVE_REQUIRED`. That is not a regression — it cannot be "fixed" without violating the no-mock rule. The Data screen's Apple Health card must be exercised from the Xcode build on a physical device.

## Failure 2 — In the Xcode build on device (the real bug)

On native, `generateACAHash` calls:

```ts
await (window as any).Capacitor.Plugins.NativeBiometric.verifyIdentity({...})
```

But `NativeBiometric` **does not exist in this project**. I checked:

- `package.json` — no `capacitor-native-biometric` (or any biometric plugin) is installed. Only `@capacitor/*` core plugins, `@capacitor-community/apple-sign-in`, and `capacitor-secure-storage-plugin`.
- `Native/ios/` and `Native/native/ios/` — only `IDIAHealthPlugin` (HealthKit) exists. No Swift `LAContext` / Face ID plugin was ever written.

So `Capacitor.Plugins.NativeBiometric` is `undefined` on the device. `.verifyIdentity(...)` throws → caught as `BIOMETRIC_REJECTED` → rewrapped as `ACA_PROMPT_REJECTED: BIOMETRIC_REJECTED`. That's the message you're seeing.

This affects every ACA touchpoint, not just Apple Health (Terms of Service accept, governance votes, committee join, NFC handshake, etc.) — they're all silently broken on device for the same reason.

# The fix

Install the community biometric plugin and wire iOS Face ID permissions.

## Steps

1. **Add `capacitor-native-biometric`** (well-maintained, used widely with Capacitor 6/7/8): `bun add capacitor-native-biometric`.
2. **Import properly** in `src/utils/acaGenerator.ts` — replace the `(window as any).Capacitor.Plugins.NativeBiometric` access with `import { NativeBiometric } from 'capacitor-native-biometric'`. Cleaner and type-safe.
3. **Add Face ID usage string** to `Native/ios/Info.plist`:
   ```xml
   <key>NSFaceIDUsageDescription</key>
   <string>IDIA requires Face ID to anchor your sovereign consent for ledger writes.</string>
   ```
   (Without it, iOS silently kills the app the first time Face ID is invoked.)
4. **Handle the `verifyIdentity` return shape correctly** — the community plugin's `verifyIdentity` resolves with `void` on success and rejects on cancel/failure. The current code reads `result.signature || result.deviceToken`, which are always `undefined`. We'll synthesize the `hardware_attestation_id` from a real signal that exists on success: `await Device.getId()` (Capacitor Device plugin) combined with the verification timestamp — both produced only after a real Face ID confirmation, so the no-simulation rule still holds.
   - If you'd rather have a true cryptographic Secure Enclave signature (not just a "Face ID succeeded" gate), that's a bigger lift — needs a custom Swift plugin around `SecKeyCreateRandomKey` with `kSecAttrTokenIDSecureEnclave`. Say the word and I'll scope it as a separate plan.
5. **Sync the native project** — after install you'll need to `npx cap sync ios` locally and rebuild in Xcode.

## Optional follow-up (recommended but separate)

The Lovable web preview will continue to throw `ACA_NATIVE_REQUIRED` on every ACA touchpoint. Right now that shows up as a red toast saying "Handshake Failed", which looks like a bug to anyone testing in the browser. A small UX improvement: detect non-native in the modal callers (`AppleHealthModal`, `TermsOfService`, etc.) and show a friendlier "Open this in the IDIA iOS app to complete" state instead of the generic error toast. I can fold this into the same plan if you want.

# What I will NOT touch

- The "no simulated ACA" rule — web preview stays refused.
- Existing ACA payload schema, edge function validation, or `user_aca_records` table.
- HealthKit plugin code — that's working; the failure is upstream at the biometric gate.

# Open question for you

Do you want **just the quick fix** (install `capacitor-native-biometric` + Info.plist + Device.getId fallback for `hardware_attestation_id`), or do you also want the **Secure Enclave signing plugin** written in Swift for a true cryptographic attestation? The quick fix unblocks you tonight; the Swift plugin is the correct long-term anchor.
