

# Fix: Apple Health Modal Silent Failure — Stale Callback References

## Problem

The `useEffect` that registers `window.onHealthDataSyncComplete` includes `onComplete` in its dependency array. When the parent re-renders during an active sync, React runs the cleanup function — deleting the bridge listener mid-flight. The iOS bridge calls `window.onHealthDataSyncComplete(...)` and hits `undefined`, silently failing. The modal stays stuck on "Connecting...".

## Fix (3 surgical changes in `AppleHealthModal.tsx`)

### 1. Add a `callbacksRef` (after line 51)

Store `onComplete` and `onClose` in a ref so the listener always has the latest version without being a dependency:

```typescript
const callbacksRef = useRef({ onComplete, onClose });
useEffect(() => {
  callbacksRef.current = { onComplete, onClose };
}, [onComplete, onClose]);
```

### 2. Empty the dependency array (line 146)

Change `}, [onComplete]);` → `}, []);`

This prevents the cleanup from ever running while the modal is mounted, keeping the bridge listener alive for the entire sync.

### 3. Use the ref in the success handler (lines 122-124)

```typescript
setTimeout(() => {
  callbacksRef.current.onComplete();
  callbacksRef.current.onClose();
}, 2500);
```

This ensures the modal both refreshes the parent data **and** closes itself after sync, using the latest callback references.

## Files Modified

| File | Change |
|------|--------|
| `src/components/AppleHealthModal.tsx` | Add `callbacksRef`, empty dependency array, use ref in setTimeout |

