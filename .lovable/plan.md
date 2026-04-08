

# Fix SovereignAuth + ACA Edge Function Error for Data Source Connections

## Root Cause

The error "Edge function returned a non-2xx status code" happens because `handleBiometricVerified` in `AppleHealthModal.tsx` calls:

```typescript
await executeWithConsent('DATA_SOURCE_CONNECTION', { provider: 'apple_health', ... }, 'health-data-bridge');
```

The `health-data-bridge` edge function expects `{ user_id, health_data }` but receives `{ provider, selected_data_types, user_id, aca_context }`. Since `health_data` is missing, it returns HTTP 400.

Additionally, `SovereignAuth` is a mock (`setTimeout`) — it needs to use the Web Authentication API for real biometric challenges on supported devices.

## Changes

### 1. Update SovereignAuth to use WebAuthn (`src/components/pro/SovereignAuth.tsx`)

Replace the `setTimeout` mock with the Web Authentication API (`navigator.credentials.create`/`navigator.credentials.get`) using `authenticatorAttachment: 'platform'` which triggers Face ID on iOS, fingerprint on Android, and Windows Hello on desktop. Falls back gracefully to mock if WebAuthn is unavailable (e.g., older browsers or non-HTTPS).

Device type recognition is automatic — WebAuthn uses whatever biometric the platform provides.

### 2. Add `recordConsent` method to `useACA` hook (`src/hooks/useACA.ts`)

Add a new function that writes the ACA hash directly to the `user_aca_records` table instead of calling an edge function. This is for consent-only actions (like connecting a data source) that don't need to invoke a backend function.

```typescript
const recordConsent = async (actionType: ConsentActionType, payloadData: Record<string, any>) => {
  const acaContext = createConsentWrapper(actionType, payloadData);
  const hashInput = `${user.id}:${actionType}:${acaContext.timestamp}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
  const acaHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  
  await supabase.from('user_aca_records').insert({
    platform_guid: user.id,
    aca_hash_key: acaHash,
    consent_type: actionType,
  });
  return acaContext;
};
```

### 3. Fix AppleHealthModal connection flow (`src/components/AppleHealthModal.tsx`)

In `handleBiometricVerified`, replace the `executeWithConsent('...', '...', 'health-data-bridge')` call with `recordConsent('DATA_SOURCE_CONNECTION', {...})`. The `health-data-bridge` is only called later by the native iOS app when actual health data is being sent — not during the consent/connection step.

### 4. Add SovereignAuth to other data source modals

Update `StravaConnectionModal.tsx`, `FordConnectionModal.tsx`, and `DataSourceModal.tsx` to:
- Import `SovereignAuth` and `useACA`
- Gate the connect action behind biometric verification
- Record the ACA consent before proceeding with OAuth/connection flows

### 5. Fix `SendRequestModal.tsx` ACA call

Same pattern — use `recordConsent` for the consent record, then call `idia-synapse` separately only if needed for the actual transaction processing.

## Files Modified

| File | Change |
|------|--------|
| `src/components/pro/SovereignAuth.tsx` | WebAuthn biometric with platform fallback |
| `src/hooks/useACA.ts` | Add `recordConsent` for direct DB ACA recording |
| `src/components/AppleHealthModal.tsx` | Use `recordConsent` instead of `executeWithConsent` to `health-data-bridge` |
| `src/components/StravaConnectionModal.tsx` | Add SovereignAuth gate + ACA consent |
| `src/components/FordConnectionModal.tsx` | Add SovereignAuth gate + ACA consent |
| `src/components/DataSourceModal.tsx` | Add SovereignAuth gate + ACA consent |
| `src/components/SendRequestModal.tsx` | Fix ACA flow to separate consent from transaction |

