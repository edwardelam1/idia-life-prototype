# Gov page links open like the Hub link, to their own pages

## Why the last attempt pointed everything at the Hub
On the Wallet page, the Hub button sends a message to the iPhone shell through a channel named `openExternalHub`. That channel only carries login tokens — no web address — so the shell always opens the Hub dashboard. Reusing it for Basescan gives the right sheet but the wrong page. The Swift handler isn't in this project; it lives in your Xcode ContentView.

Today the Gov page links do this instead:
- IDIA token link: `openBasescan()` in `BasescanSheet.tsx` does a full-page navigation in the iOS shell
- Community pool cards: a bare `window.open(...)` in `LocalizedPoolsDisplay.tsx`

## Fix: give external links their own channel and leave the Hub helper alone
1. Add a new shared helper, `openExternalLink(url)`, in `src/lib/openExternalLink.ts`:
   - iOS custom shell: if `webkit.messageHandlers.openExternalLink` exists, post `{ url }` to it
   - Capacitor (Android): open the Capacitor Browser sheet
   - Web: open a new tab, and show a toast if pop-ups are blocked
   - Only `https://basescan.org/...` addresses are allowed, with explicit BEGIN and END logs
2. Point `openBasescan()` at the new helper, using the token URL for the IDIA contract.
3. Point the pool cards at the new helper, using the pool's `address` URL.
4. Leave the Hub flow (`openExternalHub`) exactly as it is.

## Your part in Xcode (a short Swift snippet will be provided)
- Register a second handler named `openExternalLink` next to `openExternalHub`
- Read `url` from the message body and present it in the same in-app Safari sheet (`SFSafariViewController`) the Hub uses
- Until the shell is rebuilt with that handler, the iPhone falls back to the current behaviour, so the links still open instead of breaking

## Verification
- Web: each link opens its own Basescan page, not the Hub
- iPhone (after the shell rebuild): the token link and each pool card open in the Hub-style sheet with the correct address
