CREATE POLICY "No browser access to Ford OAuth states"
ON public.ford_oauth_states
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);