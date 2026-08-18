CREATE OR REPLACE FUNCTION public.prune_infra_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '1 hour';
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
END;
$$;

SELECT cron.schedule('prune-infra-logs-hourly', '7 * * * *', 'SELECT public.prune_infra_logs();');