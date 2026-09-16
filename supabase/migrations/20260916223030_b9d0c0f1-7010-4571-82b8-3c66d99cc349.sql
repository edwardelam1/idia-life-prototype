ALTER TABLE public.lifestyle_processing_queue ALTER COLUMN device_event_id DROP NOT NULL;
ALTER TABLE public.lifestyle_processing_queue ADD COLUMN IF NOT EXISTS raw_app_data_id uuid;
ALTER TABLE public.lifestyle_processing_queue ADD COLUMN IF NOT EXISTS source text;
CREATE INDEX IF NOT EXISTS idx_lifestyle_queue_raw_app_data ON public.lifestyle_processing_queue (raw_app_data_id);
CREATE INDEX IF NOT EXISTS idx_raw_app_data_source_created ON public.raw_app_data (raw_source, created_at DESC);
GRANT ALL ON public.lifestyle_processing_queue TO service_role;
GRANT ALL ON public.raw_app_data TO service_role;
GRANT ALL ON public.staged_lifestyle_data TO service_role;