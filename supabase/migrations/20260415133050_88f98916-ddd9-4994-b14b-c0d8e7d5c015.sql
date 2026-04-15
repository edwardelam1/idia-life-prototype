
-- 1. Drop the duplicate trigger on raw_health_data
DROP TRIGGER IF EXISTS tr_raw_health_to_anonymizer ON public.raw_health_data;

-- 2. Drop the trigger that uses auto_process_raw_health_data
DROP TRIGGER IF EXISTS trigger_auto_process_health_data ON public.raw_health_data;

-- 3. Drop dead functions (CASCADE to catch any remaining references)
DROP FUNCTION IF EXISTS public.fn_call_anonymizer() CASCADE;
DROP FUNCTION IF EXISTS public.auto_process_raw_health_data() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_idia_synapse_orchestration() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_health_data_processing() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_anonymization_processor() CASCADE;
