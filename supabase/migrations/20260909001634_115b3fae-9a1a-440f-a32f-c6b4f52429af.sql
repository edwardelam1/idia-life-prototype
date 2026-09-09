DELETE FROM public.data_connections
WHERE connection_type = 'ford'
  AND is_active = false
  AND access_token IS NULL
  AND last_sync_at IS NULL;