-- Fix propagate_health_to_yield trigger: net.http_post requires jsonb body, not text
-- This trigger was rolling back every raw_health_data insert, blocking the modal sync
CREATE OR REPLACE FUNCTION public.propagate_health_to_yield()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.processed = FALSE AND NEW.processing_status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/anonymization-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY'
      ),
      body := jsonb_build_object('raw_data_id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if the http call fails
  RAISE LOG 'propagate_health_to_yield failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Also fix direct_life_anonymization_trigger which has the same issue (placeholder service key)
CREATE OR REPLACE FUNCTION public.direct_life_anonymization_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.processing_status = 'pending' AND (OLD.processed IS NULL OR OLD.processed = FALSE) THEN
    UPDATE public.raw_health_data 
    SET processing_started_at = NOW() 
    WHERE id = NEW.id;
    
    PERFORM net.http_post(
      url := 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/anonymization-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY'
      ),
      body := jsonb_build_object(
        'raw_data_id', NEW.id,
        'user_id', NEW.user_id,
        'raw_payload', NEW.raw_payload,
        'step_count', NEW.step_count,
        'recorded_at', NEW.recorded_at
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'direct_life_anonymization_trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;