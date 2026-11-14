# Project architecture rules

- Keep the Life map's handcrafted vector terrain, shared road/node coordinate system, and presentation in `LifeChallengeMap`; keep completion queries in `useLifeChallengeProgress`, existing action dialogs in `LifeScreen`, and cross-tab navigation in `MainApp`. This guarantees seamless future extensions without bitmap replacement or duplicated workflows.
- Keep royalties video expansion inside its own dialog with one persistent video element; this preserves playback position and avoids native fullscreen dependencies or changes to shared dialog defaults.
- Gate all authenticated routes and root-level action dialogs in `ConsentModalHost` before mounting protected content; verify consent against Auth on entry and foreground return, and reuse the existing legal screens inside a non-dismissible dialog so routing and deep links cannot bypass missing consent.
