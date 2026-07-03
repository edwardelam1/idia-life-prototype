# Fix Apple "app loads/responds slowly" rejection

Two changes that directly attack perceived launch slowness on iOS.

## 1. Shorten the launch splash (biggest win)

`src/components/FlashingSplashScreen.tsx` currently blocks the user for a full **10 seconds** with 5 sequential animation phases before the app is usable. Apple reviewers see this as an unresponsive app.

Changes:
- Compress the sequence from 10s → **~2.2s total** (fluid 0–400ms, letters 400–1200ms, textFade 1200–1500ms, logo 1500–1900ms, white 1900–2200ms).
- Add **tap-to-skip**: tapping anywhere on the splash immediately calls `onComplete()`.
- Keep the same visual phases and assets — only durations change, so brand feel is preserved.

## 2. Lazy-load the 3D orb stack

`src/components/FriendAssistant/FriendAssistantProvider.tsx` statically imports `SovereignVisualizer`, which pulls `three`, `@react-three/fiber`, and `@react-three/drei` into the initial JS bundle every launch — even though the orb only renders when Friend Live is opened.

Changes:
- Convert `SovereignVisualizer` to `React.lazy(() => import('./SovereignVisualizer'))`.
- Wrap its render site in `<Suspense fallback={null}>`.
- Result: the 3D libraries are fetched/parsed only the first time a user opens Friend Live. No visual change.

## Out of scope

- No changes to orb visuals, particle count, or physics.
- No changes to routing, auth, or business logic.
- `FriendAssistant.tsx` re-export stays as-is (still points at the provider module).

## Validation

- Typecheck.
- Confirm splash exits in ~2s and tap dismisses it.
- Confirm Friend Live still renders the orb (lazy chunk loads on demand).
