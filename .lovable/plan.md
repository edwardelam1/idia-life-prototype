# Apple notifications and first Terms update

## Outcome
Enable real iPhone push notifications using your Apple key, with the Terms update as the first notification campaign. Tapping it opens Life, where the mandatory Terms and Attestation pop-up applies whenever consent is missing.

## Work
1. Verify that all five Apple settings are available in the connected Supabase environment. The secret-name listing available here does not show the APNs settings; they may have been added directly to external Supabase. Check availability without returning private values, and request secure entry only if they are actually missing.
2. Register the real iPhone device token automatically after sign-in and on return to the app, using the existing Swift notification bridge. Check save errors instead of reporting success when storage fails. Share one token-saving path between launch and the Settings toggle, using SELECT followed by INSERT or UPDATE, not upserts.
3. Add direct APNs delivery with Apple's signing key, the configured app identifier, and the correct production or sandbox endpoint. Keep notification content free of identity and health information. Validate authentication in the function; keep broadcast access restricted to a verified server-side administrator or a trusted server caller, never ordinary users.
4. Prepare a fixed Terms update notification, with a single-device test before any broad send. Record campaign deliveries to prevent accidental repeat broadcasts; remove only device registrations Apple explicitly reports as permanently invalid. Report accepted, failed, and skipped delivery counts without exposing device tokens.
5. Handle notification taps through the existing app consent gate. Do not change the Terms version or require already-compliant users to agree again unless the actual legal document has changed.
6. Verify the Swift wrapper requests notification permission, registers with Apple, forwards tokens reliably, and handles foreground presentation and notification taps. The iOS Swift source is not in this checkout: use the authoritative source if accessible, otherwise provide the exact required changes for that wrapper without touching Apple Health.

## Verification and rollout
- Test registration validation, authorization, campaign deduplication, and permanent-versus-transient APNs errors.
- Verify deployment and Apple credential availability without logging secret values or device tokens.
- Send one test to a real registered iPhone; confirm the notification appears and opens the required consent screen.
- Send the production Terms campaign only after that device test succeeds and you approve the broadcast. Apple accepting a push is not proof that an iPhone displayed it.

## Technical boundaries
- Keep all Apple signing credentials server-side; use the existing `push_tokens` storage with scoped user access.
- Use Supabase migrations for any delivery tracking and required table grants; do not add PII columns or alter health ingestion.
- Confirm HTTP/2 support in the deployed APNs sender before claiming delivery works.
- Publishing the web app and shipping a new native iPhone build are separate from sending a notification.