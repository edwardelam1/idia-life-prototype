

# Fix: Apple Health Sync 400 Error

## Root Cause

The native iOS bridge sends the `aca_hash` as a **URL query parameter** (`?aca_hash=xxx`), but `apple-health-sync` only reads from the JSON request body (`rawBody.aca_hash`). The hash is never found in the body, so the function returns `400: Missing required field: aca_hash`.

Evidence: Two recent 400s in edge logs both show the hash in the URL:
```
POST | 400 | .../apple-health-sync?aca_hash=c421e9c4...
POST | 400 | .../apple-health-sync?aca_hash=32129057...
```

## Fix

**File: `supabase/functions/apple-health-sync/index.ts`**

Add URL query parameter parsing at the top of the handler, before the `acaHash` assignment. Fall back to the body if not found in the URL:

```typescript
const url = new URL(req.url);
const queryAcaHash = url.searchParams.get("aca_hash");

// Fuzzy key matching — prioritize query param from native bridge
const acaHash = queryAcaHash || rawBody.aca_hash || rawBody.acaHash;
```

This is a one-line-scope change in the edge function. The rest of the pipeline (ACA verification, raw_health_data insertion, trigger chain) is unaffected.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/apple-health-sync/index.ts` | Parse `aca_hash` from URL query params, fall back to body |

