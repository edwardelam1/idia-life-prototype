

## Plan: Restore Launch Sequence + Seal PII Leak

### Changes

**1. `src/pages/Auth.tsx`** — In `handleAuth`, change `emailRedirectTo: "com.thebigidia.app://onboarding"` → `"com.thebigidia.app://"` so verified users land on `Index.tsx` and get routed correctly.

**2. `src/pages/Index.tsx`** — In `checkState`, add a 2s `launchDelay` promise that runs in parallel with `getSession()`, then `await launchDelay` before any `navigate()` call. Guarantees the "Initializing IDIA Protocol" branding is visible.

**3. `src/pages/Onboarding.tsx`** — Two surgical edits:
- **Trap fix**: In `handleUrlCapture`, change `navigate("/onboarding")` → `navigate("/")` so returning OAuth/email-verified users re-enter the launch sequence and get routed by their actual onboarding state.
- **PII leak seal**: Delete Step 5 entirely (the `supabase.auth.updateUser({ data: { first_name, last_name, full_name, display_name, pii_synced_at } })` block). PII must remain exclusively in the Secure Enclave — never in `auth.user_metadata`.

### Downstream Impact (must verify)

`EnhancedProfileSettings.tsx` was previously updated to fall back to `auth.user_metadata` when the enclave is empty. With Step 5 deleted, that fallback will return empty for all new users — which is the correct sovereign behavior. Display Name and Avatar writes to `auth.user_metadata` from that component remain valid (those are user-controlled, non-PII identity fields, not the captured KYC PII).

### Manual Step (User Action — Outside Code)

Supabase Dashboard → Authentication → URL Configuration → add to Redirect URLs:
- `https://life.thebigidia.com/*`
- `com.thebigidia.app://*`
- `capacitor://localhost/*`
- `http://localhost/*`

Site URL stays `https://thebigidia.com`.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | `emailRedirectTo` → app root |
| `src/pages/Index.tsx` | 2s launch delay before navigation |
| `src/pages/Onboarding.tsx` | Redirect trap → `/`; delete PII metadata sync |

