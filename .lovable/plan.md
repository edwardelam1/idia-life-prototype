

The error: `user_aca_records` table is missing the `consent_type` column. `Onboarding.tsx` inserts `consent_type: "KYC_CONSENT"`, but the schema doesn't have it.

## Plan: Add Missing `consent_type` Column

### Migration

```sql
ALTER TABLE public.user_aca_records
ADD COLUMN IF NOT EXISTS consent_type TEXT;
```

That's it. The column is nullable so existing rows are unaffected, and the `Onboarding.tsx` insert and `DataSourceModal.tsx` flows will succeed.

### Files Modified
| File | Change |
|------|--------|
| New migration | `ALTER TABLE user_aca_records ADD COLUMN consent_type TEXT` |

