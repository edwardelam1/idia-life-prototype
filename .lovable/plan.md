

## Plan: Add US Phone Number and Structured Address Fields to Profile Settings

### What changes

**1. Update `ProfileSettings.tsx` form schema and UI**
- Replace the single `location` text field with structured US address fields: Street Address Line 1, Street Address Line 2 (optional), City, State (dropdown of 50 US states + territories), and ZIP Code
- Add a Phone Number field with US format `(XXX) XXX-XXXX` input masking and validation
- Add Zod validation rules:
  - Phone: regex for `(XXX) XXX-XXXX` format, exactly 10 digits
  - Street1: required, max 100 chars
  - Street2: optional, max 100 chars
  - City: required, max 50 chars
  - State: required, must be valid US state/territory code
  - ZIP: required, regex for 5-digit or ZIP+4 format (`XXXXX` or `XXXXX-XXXX`)
- Format phone number as user types (auto-insert parentheses, space, dash)
- On save, store address as JSONB in the existing `full_legal_address` column and phone in `phone_number` column
- On load, parse `full_legal_address` JSONB back into individual fields

**2. USPS address validation (client-side)**
- Add a validation helper that checks the address structure against USPS-compliant standards:
  - State must be a valid 2-letter code
  - ZIP must match the 5 or 9 digit format
  - Street address must not be a PO Box if restricted (optional)
  - City + State + ZIP consistency check
- Display validation feedback inline on the form
- Note: Full USPS Address Verification API integration would require a USPS Web Tools API key. For now, implement structural validation. Can add USPS API verification as a follow-up.

**3. Update `useProfile.ts` hook**
- Add `phone_number` and `full_legal_address` to the Profile interface
- Map the JSONB address fields on load/save

**4. Update `EnhancedProfileSettings.tsx`**
- Display phone number and address in the read-only KYC section

### Technical details

- **Database**: No migration needed -- `phone_number` (text) and `full_legal_address` (JSONB) columns already exist on `profiles`
- **JSONB structure for `full_legal_address`**: `{ street1, street2, city, state, zip }`
- **Phone formatting**: Auto-format on input using a controlled component pattern
- **State dropdown**: All 50 US states + DC + territories with 2-letter codes
- **Files modified**: `ProfileSettings.tsx`, `useProfile.ts`, `EnhancedProfileSettings.tsx`

