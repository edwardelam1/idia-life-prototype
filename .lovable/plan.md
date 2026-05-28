## Plan

Replace the Terms of Service document with the user-uploaded fresh copy.

### Steps
1. Replace `public/legal/IDIA_Protocol_Terms_of_Service.pdf` with the new uploaded PDF (13 pages, up from 12).
2. Regenerate `public/legal/tos-pages/page-01.jpg` … `page-13.jpg` from the new PDF using `pdftoppm` (delete old page-01..12 and rewrite all 13). Use the same JPG format/quality as existing pages.
3. Update `src/pages/TermsOfService.tsx` line 106: change `{ length: 12 }` → `{ length: 13 }` so the new last page renders.

### Notes
- No version bump or ACA logic change requested — keeping `tos_version: "v1"`. (Tell me if you want it bumped to v2 so previously-accepted users are re-prompted.)
- No other references to the page count found.
