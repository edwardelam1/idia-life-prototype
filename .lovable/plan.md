# Auth Screen: Dark-Mode Background, Logo, and Smart Default Mode

## Problems

1. **White background in dark mode**: Both the main auth screen and the password-reset screen in `src/pages/Auth.tsx` use a hardcoded light gradient (`bg-gradient-to-br from-blue-50 to-indigo-100`), so in dark mode the area outside the sign-in card renders white while the card itself is dark.
2. **No logo**: The brand logo is not shown above the "Welcome Back / Create Account" heading.
3. **Wrong default mode**: The page defaults to "Welcome Back" (sign-in) for every visitor, even brand-new ones with no history on the device.

## Changes (all in `src/pages/Auth.tsx`)

### 1. Dark-mode-aware background
- Replace the hardcoded light gradient on both containers (main auth + reset password) with theme tokens: `bg-background` with a subtle `bg-gradient-to-b from-background to-muted/40`, so it matches the card's dark-mode surface automatically.
- Replace hardcoded gray text utilities (`text-gray-600`, `text-gray-400`) inside these views with `text-muted-foreground` so labels stay legible in dark mode.

### 2. Logo above the heading
- Add the IDIA logo (`public/lovable-uploads/...` brand asset already used elsewhere, or the `idia-hub-logo` asset) centered above the `CardTitle` in both the main auth card and the reset card, sized ~64px with alt text.

### 3. Smart default: Create Account vs Welcome Back
- Add a localStorage marker `idia_has_auth_history_v1`:
  - Set to `"1"` whenever an auth state change yields a session (existing `onAuthStateChange` handler in this page) — meaning the device has authenticated before.
- Default `isLogin` logic becomes:
  - `?mode=signup` → Create Account
  - `?mode=login` → Welcome Back
  - No param → `isLogin = localStorage marker === "1"` (returning device → Welcome Back; fresh device/browser → Create Account)

## Technical notes
- No backend, schema, or auth-flow logic changes — presentation and default-state only.
- Keeps iOS safe-area padding already in place on both containers.

## Verification
- Toggle dark mode and confirm the full viewport matches the card's dark surface (no white halo) on both the auth and reset views.
- Clear localStorage → defaults to "Create Account"; after a successful sign-in, subsequent visits default to "Welcome Back".
