# Project architecture rules

- Keep the Life challenge map presentation in `LifeChallengeMap` and completion queries in `useLifeChallengeProgress`; `LifeScreen` owns existing action dialogs, while `MainApp` owns cross-tab navigation. This keeps future map waves additive without duplicating Data or Gov workflows.
