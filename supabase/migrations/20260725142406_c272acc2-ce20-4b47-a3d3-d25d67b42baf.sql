-- 1. Temporarily lift the non-negative floor so historical rows (corrupted by
--    past manual adjustments that wrote a wrong `amount`) can be recomputed.
ALTER TABLE public.synapse_credit_ledger
  DROP CONSTRAINT IF EXISTS synapse_credit_absolute_floor;

-- 2. Recompute balance_after / balance_previous as the true signed running sum
--    of `amount` per user, in chronological order. `amount` is the source of
--    truth (it is what the Hub sums); balance_after is only a cache.
WITH recomputed AS (
  SELECT
    id,
    SUM(amount) OVER (
      PARTITION BY user_id
      ORDER BY created_at, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS new_balance_after,
    COALESCE(SUM(amount) OVER (
      PARTITION BY user_id
      ORDER BY created_at, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS new_balance_previous
  FROM public.synapse_credit_ledger
)
UPDATE public.synapse_credit_ledger l
SET
  balance_after    = r.new_balance_after,
  balance_previous = r.new_balance_previous
FROM recomputed r
WHERE l.id = r.id
  AND (
       l.balance_after    IS DISTINCT FROM r.new_balance_after
    OR l.balance_previous IS DISTINCT FROM r.new_balance_previous
  );

-- 3. Re-apply the floor as NOT VALID: enforced on every INSERT/UPDATE from now
--    on, but the two legacy negative rows are grandfathered instead of
--    blocking the repair.
ALTER TABLE public.synapse_credit_ledger
  ADD CONSTRAINT synapse_credit_absolute_floor
  CHECK (balance_after >= 0) NOT VALID;