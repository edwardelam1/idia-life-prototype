
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ssn_last_four TEXT,
  ADD COLUMN IF NOT EXISTS ssn_hash TEXT,
  ADD COLUMN IF NOT EXISTS kyc_tier INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS liveness_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.ssn_last_four IS 'Last 4 digits of SSN for display';
COMMENT ON COLUMN public.profiles.ssn_hash IS 'SHA-256 hash of full SSN';
COMMENT ON COLUMN public.profiles.kyc_tier IS '1=Basic, 2=Verified';
COMMENT ON COLUMN public.profiles.kyc_status IS 'basic, pending, verified, rejected';
