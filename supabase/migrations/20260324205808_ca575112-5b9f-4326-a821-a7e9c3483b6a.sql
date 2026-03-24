ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS full_legal_address JSONB,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;