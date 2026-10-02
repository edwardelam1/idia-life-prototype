# Project architecture rules

- Keep the Life map's handcrafted vector terrain, shared road/node coordinate system, and presentation in `LifeChallengeMap`; keep completion queries in `useLifeChallengeProgress`, existing action dialogs in `LifeScreen`, and cross-tab navigation in `MainApp`. This guarantees seamless future extensions without bitmap replacement or duplicated workflows.
