# Life Screen — Zero-Scroll Mobile Refactor

Scope: ONLY `src/components/enhanced/LifeScreen.tsx` and `src/components/life/StandingOrb.tsx`. No changes to hooks, finances, or other pages.

## 1. Layout & Viewport (Zero-Scroll)

- Replace `LifeScreen.tsx` root `<div className="space-y-4">` with a flex column constrained to the available viewport: `h-full max-h-full overflow-hidden flex flex-col`.
- Wrap inside an outer container that uses `h-[100dvh]`/`h-full` minus the header + bottom nav already accounted for by `MainApp.tsx`'s `<main>` (which gives us a clipped flex region). We add `overflow-hidden` at the Life root so nothing scrolls.
- Tabs region: `Tabs` becomes `flex-1 min-h-0 flex flex-col`; `TabsContent` uses `flex-1 min-h-0 overflow-hidden` (no scroll). The Overview tab content is shrunk to fit.
- Remove the outer `space-y-4`; use compact `gap-2` / `gap-3`.
- Wrap layout init in:
  ```ts
  useLayoutEffect(() => {
    console.log("[VIEWPORT_CALIBRATION_START]");
    return () => console.log("[VIEWPORT_CALIBRATION_END]");
  }, []);
  ```

## 2. Component Scaling

- `StandingOrb`: accept an optional `size` prop (default 240px). Pass `size={180}` from LifeScreen so it fits comfortably on iPhone 15/Pro alongside the action card and NFC button. Reduce orb label margins (`mt-6` → `mt-3`, `mt-1` → `mt-0.5`).
- Standing card padding: `p-8` → `p-4`. Inner gap `gap-8` → `gap-3`. Stack vertically on mobile (already `flex-col md:flex-row`).
- Metric cards row (Reciprocity / Vitality / Network Size): keep but compact — `text-2xl` → `text-lg`, `CardHeader pb-2` → `pb-1`, `CardContent` padding tightened. These remain only if they fit; if not, collapse into a single row of compact stats with no card chrome.

## 3. Content Removal

- Delete the entire "Recent Activity" `<Card>` block and its `goodDeeds.slice(0,5).map(...)` rendering from the Overview tab.
- Delete the `<h1>Life</h1>` page title from the top of the screen.
- The header row that previously held title + NFC button is removed entirely — NFC moves into the standing card (see §4).

## 4. NFC Relocation Into Standing Card

- Remove `<NFCHandshake />` from the page header.
- Inside the standing card's right-side action panel (the `bg-teal-50/50` block containing "Establish Your Standing" + "Take our Tests" button), append the NFC button approximately 24–32px below the "Take our Tests" button using `mt-7` (~28px) and a subtle divider `border-t border-teal-100 pt-4`.
- Wrap relocation in:
  ```ts
  useEffect(() => {
    console.log("[NFC_UI_RELOCATION_SYNC_START]");
    return () => console.log("[NFC_UI_RELOCATION_SYNC_END]");
  }, []);
  ```

## 5. Other Tabs

- Connections / Trust Circles / Good Deeds tabs: wrap their inner list in `overflow-y-auto` ONLY within the tab body (the tab body itself stays clipped within the viewport). This keeps the page itself non-scrolling while allowing list content to scroll inside the bounded tab pane. (User said zero scrolling — interpretation: the page/main view never scrolls; bounded list panes inside a tab are still constrained to the same viewport region.) If user prefers truly no scroll anywhere, lists will be capped by `max-h-full overflow-hidden` and overflow visually clipped.

## 6. Constraints Honored

- No edits to `useSocialGraph`, `useEnhancedProfile`, finances, wallet, or any other page.
- All physics, NFC handshake, color wash, and IDIA edge-function logic preserved.
- Granular paired logs added: `[VIEWPORT_CALIBRATION_START/END]`, `[NFC_UI_RELOCATION_SYNC_START/END]`. Existing `[ORB_*]`, `[NFC_HANDSHAKE_*]`, `[STANDING_SYNC_*]` logs untouched.

## Files Changed

- `src/components/enhanced/LifeScreen.tsx` — refactor JSX, remove activity + title, relocate NFC, add layout logs.
- `src/components/life/StandingOrb.tsx` — add optional `size` prop; tighten label spacing.
