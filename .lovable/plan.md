

# IDIA Life Pro Tab — Subscription Tiers & Advanced Dashboards

## Summary
Replace the current Pro tab (which just shows GovernanceScreen) with a dedicated `ProScreen` component featuring three subscription tiers, glassmorphism UI, and tier-gated dashboards.

## Database Changes

**New table: `user_subscriptions`**
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, not null)
- `tier` (text: 'pro' | 'pro_plus' | 'pure_alpha', not null)
- `status` (text: 'active' | 'canceled' | 'expired', default 'active')
- `started_at` (timestamptz, default now())
- `expires_at` (timestamptz)
- `created_at` / `updated_at`
- RLS: users can read/insert their own subscriptions

## New Components

### 1. `src/components/pro/ProScreen.tsx` — Main container
- Checks user's active subscription tier
- If no subscription: shows **Paywall** with three tier cards
- If subscribed: shows the unlocked dashboard for their tier
- Glassmorphism styling with `backdrop-blur-xl`, layered gradients using Trust-Blue (teal) and IDIA Gold (amber)

### 2. `src/components/pro/ProPaywall.tsx` — Tier selection
Three cards side-by-side (scrollable on mobile):
- **IDIA Life Pro** — $9.99/mo — "Workforce Optimization" — HRI dashboard, gig tools
- **IDIA Life Pro+** — $29.99/mo — "Cognitive Performance" — CPM, Gamma triggers, RSVP
- **Pure Alpha** — $99.99/mo — "Executive Sovereignty" — P&L Fusion Dashboard
- Each card has a "Subscribe" button that writes to `user_subscriptions`
- Mock RevenueCat-style modal confirmation before subscribing

### 3. `src/components/pro/BioTetherLink.tsx` — Privacy Handshake
- Animated visualization showing HealthKit/Google Fit data streams (HR, HRV, Sleep)
- Swipe-to-link action using a draggable slider
- Glassmorphic card with pulsing bio-data indicators

### 4. `src/components/pro/HRIDashboard.tsx` — Pro tier dashboard
- Circular gauge (SVG) showing HRI score (0-100%)
- Color transitions: green > amber > red as score drops
- "Low Cognitive Battery" toast notification when score < 30%
- Gig economy performance metrics cards

### 5. `src/components/pro/CPMDashboard.tsx` — Pro+ tier dashboard
- Biometric grid with simulated data (per existing CPM exception)
- **Gamma Trigger toggle**: when activated, renders a 40Hz visual flicker overlay (CSS animation) and RSVP text sequence
- "Memory Anchoring" RSVP module: words flash at configurable speed
- Pattern of Life visualization

### 6. `src/components/pro/PureAlphaDashboard.tsx` — Pure Alpha tier dashboard
- **P&L Fusion Chart** using recharts `ComposedChart`:
  - Line: HRV trend over time
  - Line: Sleep latency
  - Bar: Revenue / Total Earned
  - Dual Y-axes (bio metrics vs financial)
- Glassmorphic card overlays with blur layers

### 7. `src/components/pro/GhostProtocol.tsx` — Duress detection
- Monitors HR delta and motion data from context
- If HR spike > +30bpm with zero motion detected, swap dashboard to a fake "honey-pot" view
- Fake dashboard shows plausible but static dummy data

### 8. `src/components/pro/SovereignAuth.tsx` — Biometric challenge
- Pattern-of-life anomaly check before unlocking Pro features
- Triggers native biometric prompt (or simulated FaceID/fingerprint UI for web)
- Gates access to dashboards on anomaly detection

## MainApp.tsx Update
- Import `ProScreen` and map the `'pro'` tab to it instead of `GovernanceScreen`

## Styling
- New CSS variables in `index.css`:
  - `--idia-gold: 28 80% 55%` (already exists as accent amber)
  - `--trust-blue: 178 42% 32%` (already defined)
- Glassmorphism utility classes: `bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl`
- Accelerometer-reactive lighting: CSS custom properties updated via `DeviceMotionEvent` listener for subtle gradient shifts

## Technical Notes
- HRI is excluded from main data dashboards per memory constraint, but is allowed within the gated Pro tab
- CPM dashboard uses simulated data per existing exception
- All subscription writes go through authenticated Supabase client with RLS
- No real payment processing — mock paywall UI only
- Recharts already in the project (used by `chart.tsx`)

