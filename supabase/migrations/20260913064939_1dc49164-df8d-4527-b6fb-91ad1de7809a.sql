CREATE TABLE public.ford_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ford_oauth_states TO service_role;

ALTER TABLE public.ford_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX ford_oauth_states_expires_at_idx ON public.ford_oauth_states (expires_at);