# Fix Ford sign-in redirect + royalty pop-up polish

## 1. Ford sends you straight back instead of showing the Ford sign-in page

### What the evidence shows

The newest Ford callback log entry (2026-09-12 02:10 UTC) reads:

`[BEGIN: Ford.Callback] method=GET hasCode=false hasState=false error=none`

So Ford is bouncing the browser straight back to our callback with no authorization code and no state at all — the sign-in page never renders. Our callback then shows the "Ford link incomplete" page, which auto-returns to the app. That is the "redirect thing" you are seeing.

Comparing the file history, exactly one thing changed in the sign-in URL since the version that reached Ford's login screen: `response_mode=query` was added to `ford-auth-url`. Ford's `/common/login` entry point is not a standard OAuth authorize endpoint and rejecting/ignoring unknown parameters by bouncing back matches the empty callback we are logging.

### What to change (server-side only)

1. **`ford-auth-url`** — restore the previously working authorize URL: drop `response_mode=query`, keep `make=F`, `application_id`, `client_id`, `response_type=code`, `state`, encoded `redirect_uri`, `scope=access`. Log the exact URL built (client id redacted) so the next attempt is traceable.
2. **`ford-oauth-callback`** — when Ford returns with no code and no state, stop silently redirecting into the app. Log every query parameter Ford did send and show a page that says the Ford sign-in did not start, with a "Try again" link back to the app, so a bounce is never mistaken for a completed link.
3. Leave the token-exchange retry chain, connection activation, first telemetry pull, and success redirect exactly as they are — those are already correct and untouched.

Nothing in `FordConnectionModal.tsx`, Apple Health, or the native layer changes.

### Verification

After deploy, you do one real Ford sign-in from your device. I then read the callback logs and the connection row to confirm Ford actually presented its login page and returned a code. No simulated calls from my side.

## 2. "How to generate royalties" pop-up

### 2.1 Left-justify the list

The four steps become a left-aligned list inside the otherwise centered pop-up: title, description, video and button stay centered; only the steps block aligns left (with its own left padding so it reads as a list, not as stray text).

### 2.2 Video does not autoplay on iPhone

iOS only autoplays when the muted flag is present on the element itself at load time and playback is inline. Current setup sets these through React props after the source is attached, which iOS can miss, and the file is a large `.mov`.

Changes in `RoyaltyInfoModal.tsx`:
- Set `muted`, `playsinline`, `webkit-playsinline`, `autoplay` and `preload` directly on the element via the ref before the source is assigned, then call `play()`.
- Retry playback on the `loadeddata` and `canplay` events and when the page becomes visible again, so a slow first byte on cellular does not leave a frozen frame.
- Keep it silent: no visible fallback control, matching how the splash video is handled.

If iPhone Low Power Mode is on, iOS blocks all autoplay regardless of markup — that is an OS-level rule we cannot override.

## Out of scope

Apple Health modal, the health edge function, Swift/native code, royalty calculation, and payout pipelines.
