import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type KYCTier = 1 | 2;
export type KYCStatus = 'basic' | 'pending' | 'verified' | 'rejected';

export interface KYCState {
  tier: KYCTier;
  status: KYCStatus;
  hasSSN: boolean;
  hasAddress: boolean;
  ssnLastFour: string | null;
  documentType: string | null;
  livenessVerified: boolean;
  submittedAt: string | null;
  verifiedAt: string | null;
  loading: boolean;
}

export const useKYCStatus = () => {
  const [state, setState] = useState<KYCState>({
    tier: 1,
    status: 'basic',
    hasSSN: false,
    hasAddress: false,
    ssnLastFour: null,
    documentType: null,
    livenessVerified: false,
    submittedAt: null,
    verifiedAt: null,
    loading: true,
  });

  const loadKYC = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('ssn_last_four, ssn_hash, kyc_tier, kyc_status, kyc_submitted_at, kyc_verified_at, document_type, liveness_verified, full_legal_address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading KYC:', error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const addr = data?.full_legal_address as any;
      const hasAddress = !!(addr && addr.street1 && addr.city && addr.state && addr.zip);

      setState({
        tier: (data?.kyc_tier === 2 ? 2 : 1) as KYCTier,
        status: (data?.kyc_status || 'basic') as KYCStatus,
        hasSSN: !!data?.ssn_hash,
        hasAddress,
        ssnLastFour: data?.ssn_last_four || null,
        documentType: data?.document_type || null,
        livenessVerified: data?.liveness_verified || false,
        submittedAt: data?.kyc_submitted_at || null,
        verifiedAt: data?.kyc_verified_at || null,
        loading: false,
      });
    } catch (err) {
      console.error('KYC load error:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    loadKYC();
  }, [loadKYC]);

  const submitSSN = async (ssn: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Hash SSN client-side (in production, do this server-side)
    const encoder = new TextEncoder();
    const data = encoder.encode(ssn + 'IDIA_SSN_SALT');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const lastFour = ssn.slice(-4);

    const { error } = await supabase
      .from('profiles')
      .update({
        ssn_hash: hashHex,
        ssn_last_four: lastFour,
      } as any)
      .eq('user_id', user.id);

    if (error) throw error;
    await loadKYC();
  };

  const submitVerification = async (documentType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        document_type: documentType,
        kyc_status: 'pending',
        kyc_submitted_at: new Date().toISOString(),
      } as any)
      .eq('user_id', user.id);

    if (error) throw error;
    await loadKYC();
  };

  const completeLiveness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        liveness_verified: true,
      } as any)
      .eq('user_id', user.id);

    if (error) throw error;
    await loadKYC();
  };

  const simulateVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        kyc_tier: 2,
        kyc_status: 'verified',
        kyc_verified_at: new Date().toISOString(),
      } as any)
      .eq('user_id', user.id);

    if (error) throw error;
    await loadKYC();
  };

  const isWalletGated = !state.hasSSN || !state.hasAddress;
  const canWithdraw = state.tier === 2 && state.status === 'verified';
  const canDeposit = state.tier >= 1;
  const depositLimit = state.tier === 1 ? 1000 : Infinity;

  return {
    ...state,
    isWalletGated,
    canWithdraw,
    canDeposit,
    depositLimit,
    submitSSN,
    submitVerification,
    completeLiveness,
    simulateVerification,
    reload: loadKYC,
  };
};
