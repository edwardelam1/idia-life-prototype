ALTER TABLE public.good_deeds ADD COLUMN IF NOT EXISTS doer_id uuid;
CREATE INDEX IF NOT EXISTS good_deeds_doer_id_idx ON public.good_deeds(doer_id);

CREATE OR REPLACE FUNCTION public.enforce_good_deed_witness()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.doer_id IS NOT DISTINCT FROM OLD.doer_id AND NEW.user_id = OLD.user_id THEN
    RETURN NEW;
  END IF;
  IF NEW.doer_id IS NULL THEN
    RAISE EXCEPTION 'A Good Deed must name the Connection who did it';
  END IF;
  IF NEW.doer_id = NEW.user_id THEN
    RAISE EXCEPTION 'You cannot submit a Good Deed about yourself';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.friends f
    WHERE f.status = 'accepted'
      AND ((f.user_id_1 = NEW.user_id AND f.user_id_2 = NEW.doer_id)
        OR (f.user_id_2 = NEW.user_id AND f.user_id_1 = NEW.doer_id))
  ) THEN
    RAISE EXCEPTION 'The doer must be one of your Connections';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS good_deeds_enforce_witness ON public.good_deeds;
CREATE TRIGGER good_deeds_enforce_witness BEFORE INSERT OR UPDATE ON public.good_deeds
FOR EACH ROW EXECUTE FUNCTION public.enforce_good_deed_witness();