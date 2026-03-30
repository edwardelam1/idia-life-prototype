

# Replace IDIA Life Logo Everywhere

## What
Copy the uploaded polished logo to `src/assets/IDIA_Life_Logo_Polished.png` and `public/images/IDIA_Life_Logo_Polished.png`, then replace every reference to the old logo (`/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png`).

## Files to Change

1. **Copy uploaded image** to:
   - `src/assets/IDIA_Life_Logo_Polished.png` (for React component imports)
   - `public/images/IDIA_Life_Logo_Polished.png` (for favicon and HTML meta tags)

2. **`src/components/FlashingSplashScreen.tsx`** — Import from `@/assets/IDIA_Life_Logo_Polished.png`, replace the `src` on the logo `<img>`.

3. **`src/components/LandingScreen.tsx`** — Same import and replacement.

4. **`src/components/Header.tsx`** — Same import and replacement.

5. **`index.html`** — Update favicon `href` to `/images/IDIA_Life_Logo_Polished.png`. (OG/Twitter meta images already use the polished logo via external URL, no change needed.)

