-- Phase 1: Enhanced Database Schema & KYC Infrastructure

-- Extend profiles table with KYC and additional fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_legal_address JSONB,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS ssn_last4 TEXT,
ADD COLUMN IF NOT EXISTS ein TEXT,
ADD COLUMN IF NOT EXISTS is_501c3_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal' CHECK (account_type IN ('personal', 'business', 'non-profit')),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS aliases TEXT[],
ADD COLUMN IF NOT EXISTS quiet_time_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_time_start TIME,
ADD COLUMN IF NOT EXISTS quiet_time_end TIME,
ADD COLUMN IF NOT EXISTS ai_assistant_name TEXT DEFAULT 'Friend',
ADD COLUMN IF NOT EXISTS motivational_phase TEXT DEFAULT 'acquisition' CHECK (motivational_phase IN ('acquisition', 'activation', 'retention', 'contribution')),
ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS available_credit_line NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_seed_backed_up BOOLEAN DEFAULT false;

-- Create interests table
CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_interests junction table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL UNIQUE,
  cash_balance NUMERIC DEFAULT 0.0,
  idia_usd_balance NUMERIC DEFAULT 0.0,
  idia_token_balance NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create data_sources table
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  source_name TEXT NOT NULL CHECK (source_name IN ('plaid', 'healthkit', 'angelic_xr', 'strava', 'nike', 'apple_health')),
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  encrypted_token TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, source_name)
);

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 != user_id_2)
);

-- Create trust_circles table
CREATE TABLE IF NOT EXISTS public.trust_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  description TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trust_circle_members table
CREATE TABLE IF NOT EXISTS public.trust_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.trust_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

-- Create endorsements table
CREATE TABLE IF NOT EXISTS public.endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  endorsee_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  skill_text TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (endorser_id != endorsee_id)
);

-- Create good_deeds table
CREATE TABLE IF NOT EXISTS public.good_deeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  evidence_url TEXT,
  verified_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create praises table
CREATE TABLE IF NOT EXISTS public.praises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  praiser_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  praised_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  circle_id UUID REFERENCES public.trust_circles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (praiser_id != praised_id)
);

-- Create social_health_metrics table
CREATE TABLE IF NOT EXISTS public.social_health_metrics (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reciprocity_score NUMERIC DEFAULT 0.5,
  network_vitality_score NUMERIC DEFAULT 0.5,
  trust_network_size INTEGER DEFAULT 0,
  weekly_interactions_count INTEGER DEFAULT 0,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pulse_surveys table
CREATE TABLE IF NOT EXISTS public.pulse_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create pulse_survey_responses table
CREATE TABLE IF NOT EXISTS public.pulse_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.pulse_surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  sentiment_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(survey_id, user_id)
);

-- Create social_analytics_consent table
CREATE TABLE IF NOT EXISTS public.social_analytics_consent (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  excluded_friend_ids UUID[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create legal_agreements table
CREATE TABLE IF NOT EXISTS public.legal_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL CHECK (agreement_type IN ('terms_of_service', 'privacy_policy', 'data_monetization', 'kyc_consent')),
  version TEXT NOT NULL,
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create user_consents table for granular data permissions
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('health_data', 'financial_data', 'location_data', 'behavioral_data', 'social_data')),
  is_granted BOOLEAN DEFAULT false,
  granular_permissions JSONB DEFAULT '{}',
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Insert default interests
INSERT INTO public.interests (name, category) VALUES
('Fitness & Wellness', 'health'),
('Personal Finance', 'finance'),
('Technology', 'tech'),
('Travel', 'lifestyle'),
('Cooking', 'lifestyle'),
('Reading', 'education'),
('Music', 'entertainment'),
('Photography', 'creative'),
('Sustainable Living', 'environment'),
('Community Service', 'social'),
('Entrepreneurship', 'business'),
('Mental Health', 'health'),
('Nutrition', 'health'),
('Investment', 'finance'),
('Cryptocurrency', 'finance'),
('Data Privacy', 'tech'),
('Social Impact', 'social'),
('Art & Design', 'creative'),
('Sports', 'health'),
('Gaming', 'entertainment')
ON CONFLICT (name) DO NOTHING;

-- Insert default pulse survey
INSERT INTO public.pulse_surveys (title, description, questions, is_active) VALUES
(
  'Weekly Wellness Check',
  'A quick check-in on your social and emotional wellbeing',
  '[
    {
      "id": "mood",
      "question": "How would you rate your overall mood this week?",
      "type": "scale",
      "scale": {"min": 1, "max": 10, "labels": {"1": "Very Low", "10": "Excellent"}}
    },
    {
      "id": "social_connection",
      "question": "How connected do you feel to your friends and community?",
      "type": "scale",
      "scale": {"min": 1, "max": 10, "labels": {"1": "Very Disconnected", "10": "Very Connected"}}
    },
    {
      "id": "financial_stress",
      "question": "How would you rate your financial stress level?",
      "type": "scale",
      "scale": {"min": 1, "max": 10, "labels": {"1": "Very Stressed", "10": "No Stress"}}
    },
    {
      "id": "support_needed",
      "question": "What type of support would be most helpful right now?",
      "type": "multiple_choice",
      "options": ["Financial guidance", "Social connection", "Health advice", "Career support", "None needed"]
    }
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.good_deeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.praises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_interests
CREATE POLICY "Users can view their own interests"
  ON public.user_interests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own interests"
  ON public.user_interests FOR ALL
  USING (user_id = auth.uid());

-- Create RLS policies for wallets
CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet"
  ON public.wallets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can manage wallets"
  ON public.wallets FOR ALL
  USING (true);

-- Create RLS policies for data_sources
CREATE POLICY "Users can manage their own data sources"
  ON public.data_sources FOR ALL
  USING (user_id = auth.uid());

-- Create RLS policies for friends
CREATE POLICY "Users can view their friendships"
  ON public.friends FOR SELECT
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

CREATE POLICY "Users can manage their friendships"
  ON public.friends FOR ALL
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- Create RLS policies for trust_circles
CREATE POLICY "Users can view their circles"
  ON public.trust_circles FOR SELECT
  USING (owner_id = auth.uid() OR id IN (
    SELECT circle_id FROM public.trust_circle_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own circles"
  ON public.trust_circles FOR ALL
  USING (owner_id = auth.uid());

-- Create RLS policies for social features
CREATE POLICY "Users can view endorsements they're involved in"
  ON public.endorsements FOR SELECT
  USING (endorser_id = auth.uid() OR endorsee_id = auth.uid());

CREATE POLICY "Users can create endorsements"
  ON public.endorsements FOR INSERT
  WITH CHECK (endorser_id = auth.uid());

CREATE POLICY "Users can view good deeds"
  ON public.good_deeds FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own good deeds"
  ON public.good_deeds FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view praises they're involved in"
  ON public.praises FOR SELECT
  USING (praiser_id = auth.uid() OR praised_id = auth.uid());

CREATE POLICY "Users can create praises"
  ON public.praises FOR INSERT
  WITH CHECK (praiser_id = auth.uid());

-- Create RLS policies for social health metrics
CREATE POLICY "Users can view their own social health metrics"
  ON public.social_health_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can manage social health metrics"
  ON public.social_health_metrics FOR ALL
  USING (true);

-- Create RLS policies for surveys
CREATE POLICY "Users can view active surveys"
  ON public.pulse_surveys FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage their survey responses"
  ON public.pulse_survey_responses FOR ALL
  USING (user_id = auth.uid());

-- Create RLS policies for consent tables
CREATE POLICY "Users can manage their own consent"
  ON public.social_analytics_consent FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own legal agreements"
  ON public.legal_agreements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create legal agreements"
  ON public.legal_agreements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own consents"
  ON public.user_consents FOR ALL
  USING (user_id = auth.uid());

-- Public access for interests
CREATE POLICY "Anyone can view interests"
  ON public.interests FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_users ON public.friends(user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_endorsements_endorsee ON public.endorsements(endorsee_id);
CREATE INDEX IF NOT EXISTS idx_praises_praised ON public.praises(praised_id);
CREATE INDEX IF NOT EXISTS idx_pulse_responses_user ON public.pulse_survey_responses(user_id);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trust_circles_updated_at
  BEFORE UPDATE ON public.trust_circles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_health_metrics_updated_at
  BEFORE UPDATE ON public.social_health_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_analytics_consent_updated_at
  BEFORE UPDATE ON public.social_analytics_consent
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();