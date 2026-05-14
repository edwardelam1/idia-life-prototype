## Plan

Apply the same in-app rendered viewer to the Terms of Service popup as was done for the DUNA Welcome Manual.

1. **Pre-render ToS pages**
   - Convert all 12 pages of `public/legal/IDIA_Protocol_Terms_of_Service.pdf` into JPG images at `public/legal/tos-pages/page-NN.jpg` using `pdftoppm` at 150 DPI.

2. **Update `src/pages/TermsOfService.tsx`**
   - Replace the `<object>`/`<iframe>` PDF embed inside the scrollable container with a stacked column of 12 `<img>` tags (one per page), matching the DUNA gate styling: `w-full max-w-[760px] rounded-md shadow-md border border-border bg-white`, eager-load the first two pages, lazy-load the rest, with proper alt text.
   - Keep the existing modal header, footer, scroll-to-bottom acceptance gate, ACA hash flow, `device_events` + `user_aca_records` inserts, auth metadata update, and "Download PDF Copy" link unchanged.
   - Add an "Open in new tab" fallback link consistent with the DUNA gate.

3. **Validate**
   - Confirm the 12 page images exist on disk.
   - Confirm the route renders without depending on the browser PDF plugin.