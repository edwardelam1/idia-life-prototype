import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConsentActionType = 
  | 'DATA_SOURCE_CONNECTION'
  | 'DATA_MONETIZATION_OPT_IN'
  | 'FINANCIAL_TRANSACTION'
  | 'NFC_PAYROLL_EXECUTION';

export interface ConsentPayload {
  consent_action_type: ConsentActionType;
  timestamp: string;
  payload: Record<string, any>;
}

export const useACA = () => {
  const createConsentWrapper = useCallback((actionType: ConsentActionType, payloadData: Record<string, any>): ConsentPayload => {
    return {
      consent_action_type: actionType,
      timestamp: new Date().toISOString(),
      payload: payloadData
    };
  }, []);

  /**
   * Records consent directly to user_aca_records table with SHA-256 hash.
   * Use for consent-only actions (data source connections) that don't need an edge function.
   */
  const recordConsent = useCallback(async (actionType: ConsentActionType, payloadData: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const acaContext = createConsentWrapper(actionType, payloadData);
    const hashInput = `${user.id}:${actionType}:${acaContext.timestamp}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
    const acaHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('user_aca_records').insert({
      platform_guid: user.id,
      aca_hash_key: acaHash,
      consent_type: actionType,
    });

    if (error) {
      console.error('[ACA] Failed to record consent:', error);
      throw error;
    }

    console.log(`[ACA] Consent recorded: ${actionType} → ${acaHash.slice(0, 12)}…`);
    return acaContext;
  }, [createConsentWrapper]);

  /**
   * Executes a backend Edge Function with the ACA wrapper attached to the request body.
   * Also records the consent hash to user_aca_records.
   */
  const executeWithConsent = async (
    actionType: ConsentActionType,
    payloadData: Record<string, any>,
    edgeFunctionName: string
  ) => {
    // Record consent first
    const acaContext = await recordConsent(actionType, payloadData);

    const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
      body: {
        ...payloadData,
        aca_context: acaContext 
      }
    });

    if (error) {
      console.error(`[ACA] Edge function execution failed for ${edgeFunctionName}:`, error);
      throw error;
    }
    
    return data;
  };

  return { createConsentWrapper, recordConsent, executeWithConsent };
};
