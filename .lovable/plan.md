## Plan

1. **Fix the DUNA popup viewer**
   - Replace the current `<iframe>` PDF embed in `WelcomeManualGate` with an in-app rendered document view.
   - Use pre-rendered page images generated from `public/legal/IDIA_Data_DUNA_Welcome_Manual.pdf`, so the manual displays reliably inside the popup instead of depending on the browser’s native PDF plugin.

2. **Keep existing governance acknowledgement behavior**
   - Preserve the scroll-to-bottom requirement before enabling “I Understand”.
   - Preserve ACA hash generation, `device_events`, `user_aca_records`, and auth metadata updates exactly as they are.
   - Keep the existing “Open in new tab” and “Download PDF Copy” fallbacks.

3. **Match the existing Vote page UX**
   - Keep the current modal header/footer structure and DUNA styling.
   - Render all manual pages stacked in the scroll window with stable responsive widths, page shadows, and alt text.
   - Avoid changing the Hats Wardrobe or governance voting logic.

4. **Validate**
   - Confirm the PDF file exists and is valid.
   - Confirm the rendered page assets are created from the 11-page PDF.
   - Verify the updated component references all rendered pages and still includes the PDF download/open fallback.