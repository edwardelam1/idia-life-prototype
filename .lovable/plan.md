

# Fix Header Safe Area Inset

## Problem
The fixed header sits at `top: 0`, which on mobile devices (especially iPhones with notches) causes it to render behind the system status bar (time, signal, wifi icons).

## Solution
Use `env(safe-area-inset-top)` to push the header below the device's status bar area. The viewport already has `viewport-fit=cover` set in `index.html`, which is required for safe area insets to work.

## Changes

### 1. `src/components/Header.tsx`
- Add `pt-[env(safe-area-inset-top)]` padding and keep `top-0` so the header background extends behind the status bar but content sits below it

### 2. `src/components/MainApp.tsx`
- Update the main content `pt-14` to account for the safe area inset as well: `pt-[calc(3.5rem+env(safe-area-inset-top))]`

### 3. `src/index.css`
- Add a utility for safe-area bottom inset on the bottom nav bar (the `nav` in MainApp also needs `pb-[env(safe-area-inset-bottom)]` to avoid the home indicator on newer iPhones)

### 4. `src/components/MainApp.tsx` — Bottom Nav
- Add safe area bottom padding to the fixed bottom navigation bar

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Add safe-area-inset-top padding |
| `src/components/MainApp.tsx` | Update content top padding + bottom nav safe area |

