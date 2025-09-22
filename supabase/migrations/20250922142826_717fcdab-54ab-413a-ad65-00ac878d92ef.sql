-- Set up cron job for daily Apple Health sync
-- This will run every day at 6 AM UTC to sync Apple Health data

SELECT cron.schedule(
  'daily-apple-health-sync',
  '0 6 * * *', -- 6 AM UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/daily-apple-health-sync'::text,
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:=concat('{"triggered_by": "cron", "sync_time": "', now()::text, '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger daily sync for testing
CREATE OR REPLACE FUNCTION public.trigger_daily_apple_health_sync()
RETURNS TABLE(request_id bigint)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT net.http_post(
    url := 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/daily-apple-health-sync'::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
    body := concat('{"triggered_by": "manual", "sync_time": "', now()::text, '"}')::jsonb
  ) as request_id;
$$;