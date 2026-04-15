

# Fix: DataSourceModal.tsx Build Errors + Apple Health Modal Flow

## Problem

`DataSourceModal.tsx` has three syntax errors caused by a stray code block that was accidentally inserted:

1. **Line 9**: Duplicate `import { supabase }` — already imported on line 7
2. **Lines 24-41**: A stray duplicate `handleConnect` function with wrong signature `(sourceId: string, user: any)` — this creates a syntax collision with the real function body starting at line 42
3. The real function body (lines 42-131) references `userId` but never declares it because the original function declaration was replaced by the duplicate

## Fix

**File: `src/components/DataSourceModal.tsx`**

1. Remove the duplicate import on line 9
2. Remove the stray `handleConnect` duplicate (lines 24-41) 
3. Restore the proper `handleConnect` function declaration that:
   - Takes no parameters (it's called from `onClick={handleConnect}`)
   - Gets the user session via `supabase.auth.getSession()`
   - Defines `userId` from the session
   - Then continues into the existing function body (lines 42-131)

The restored function will look like:
```typescript
const handleConnect = async () => {
  setIsConnecting(true);
  setErrorMessage(null);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setErrorMessage("Please sign in first.");
      setIsConnecting(false);
      return;
    }
    const userId = session.user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_guid")
      .eq("user_id", userId)
      .maybeSingle();
    const platformGuid = profile?.platform_guid || userId;
    // ... rest of existing code from line 44 onward
```

No changes needed to `AppleHealthModal.tsx` — the modal flow is already correct. The build errors in `DataSourceModal.tsx` are what's blocking the app from compiling.

## Files Modified

| File | Change |
|------|--------|
| `src/components/DataSourceModal.tsx` | Remove duplicate import, remove stray function, restore proper `handleConnect` declaration |
