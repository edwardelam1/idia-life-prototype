CREATE TABLE public.life_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assessment_completed_at TIMESTAMPTZ,
  wave_one_celebrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT life_challenge_progress_user_unique UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.life_challenge_progress TO authenticated;
GRANT ALL ON public.life_challenge_progress TO service_role;

ALTER TABLE public.life_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "life_progress_select_own"
ON public.life_challenge_progress
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "life_progress_insert_own"
ON public.life_challenge_progress
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "life_progress_update_own"
ON public.life_challenge_progress
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_life_challenge_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_life_challenge_progress_updated_at
BEFORE UPDATE ON public.life_challenge_progress
FOR EACH ROW
EXECUTE FUNCTION public.touch_life_challenge_progress_updated_at();