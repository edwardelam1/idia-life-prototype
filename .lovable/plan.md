

# Fix: `validate_real_health_data()` trigger crashes on missing `step_count` column

## Root Cause

The `validate_real_health_data()` BEFORE INSERT trigger on `raw_health_data` references `NEW.step_count` and `NEW.raw_payload->>'heart_rate'`, but the `step_count` column no longer exists on the table. Every insert fails with:

```
record "new" has no field "step_count"
```

This blocks the entire pipeline — nothing can be written to `raw_health_data`.

## Fix

**One database migration** to replace the trigger function body. Extract values from `raw_payload` JSONB instead of referencing nonexistent columns:

```sql
CREATE OR REPLACE FUNCTION public.validate_real_health_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_step_count numeric;
  v_heart_rate numeric;
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid health data: missing user_id';
  END IF;

  -- Extract values safely from raw_payload
  v_step_count := (NEW.raw_payload->>'value')::numeric;
  v_heart_rate := (NEW.raw_payload->>'heart_rate')::numeric;

  -- Only validate if the values are present
  IF v_step_count IS NOT NULL AND (v_step_count > 50000 OR v_step_count < 0) THEN
    RAISE EXCEPTION 'Invalid health data: unrealistic step count';
  END IF;

  IF v_heart_rate IS NOT NULL AND (v_heart_rate > 220 OR v_heart_rate < 30) THEN
    RAISE EXCEPTION 'Invalid health data: unrealistic heart rate';
  END IF;

  RETURN NEW;
END;
$$;
```

No edge function changes needed. No UI changes needed. The `apple-health-sync` function code is correct — it's this trigger that blocks the insert before the row is ever created.

## Files Modified

| Asset | Change |
|-------|--------|
| Database migration | Replace `validate_real_health_data()` function body |

