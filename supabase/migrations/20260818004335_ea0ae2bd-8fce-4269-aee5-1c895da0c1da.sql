CREATE INDEX IF NOT EXISTS idx_staged_health_user_processed
  ON public.staged_health_data (user_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_staged_health_created_at
  ON public.staged_health_data (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_egress_pending_mint
  ON public.egress_logs (settled_at ASC)
  WHERE settled_at IS NOT NULL AND (nft_minted IS NULL OR nft_minted = false);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_address_lower
  ON public.wallets (lower(wallet_address));