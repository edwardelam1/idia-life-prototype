# Add GUID button to Life > Connections

## What changes
- A small, low-key "Add +" button sits at the top right of the Connections card, on the same line as "Your Connections".
- Tapping it opens the existing "Make a Connection" pop-up (the same one Challenge 2 uses). It offers NFC Sync or typing another person's GUID.
- When a GUID is added, the person shows up in the list right away. Then the "Name this Connection" pop-up appears, as it does today.
- The empty-list hint now says: "Sync in person by tapping phones, or tap Add + to enter their GUID."

## Technical details
- `LifeScreen.tsx`: lay out the CardHeader as a row (`flex-row items-center justify-between space-y-0`), with a ghost `sm` Button (teal text, `Plus` icon, label "Add") that calls `setConnectionDialogOpen(true)`.
- Reuses the existing `resolveConnection` → `nfc-handshake-resolve` (`manual_guid`). That path already checks the GUID, blocks connecting to yourself, and records consent. No changes to the server or the data.
- Update the empty-state text only. Nothing else changes.
