# Fix the Gov manual position and Basescan opening

## What will change

- Move the Welcome Manual below the fixed app header and iPhone safe area, so its frame and title remain fully visible.
- Keep the manual’s Close control visible while the pages scroll within the available screen height.
- Remove the embedded Basescan frame entirely; Basescan blocks embedded display and the current load event can incorrectly leave a blank panel.
- Open Basescan in the device’s native in-app browser surface:
  - iPhone custom ContentView: use the same top-level external navigation handoff already used by the shell for authentication, producing a Safari-style sheet with its own Done/Close control.
  - Android Capacitor: use the existing Capacitor Browser sheet.
  - Regular web browsers: open a normal new browser tab.
- If the native handoff cannot start, keep the user on the Gov page and show a clear error instead of a blank window.

## Technical details

- Replace `BasescanSheet` state and rendering with one platform-aware `openBasescan` action; no iframe or simulated explorer content.
- Preserve the current token contract URL and the Gov card interaction.
- Size the manual against the fixed header plus `env(safe-area-inset-top)` and available dynamic viewport height; retain bottom safe-area clearance.
- Verify the manual title/Close control at mobile and desktop sizes, and verify the web fallback opens the exact Basescan token URL.
