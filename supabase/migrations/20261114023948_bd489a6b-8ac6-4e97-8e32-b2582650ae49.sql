GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
CREATE TABLE public.push_campaign_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign text NOT NULL,
 push_token_id uuid NOT NULL REFERENCES public.push_tokens(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'claimed',
 apns_status integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(campaign, push_token_id)
);
GRANT ALL ON public.push_campaign_deliveries TO service_role;
ALTER TABLE public.push_campaign_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server manages push deliveries" ON public.push_campaign_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER push_campaign_deliveries_updated_at BEFORE UPDATE ON public.push_campaign_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();