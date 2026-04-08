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
  /**
   * Generates the deterministic consent wrapper.
   * The timestamp is locked at the exact moment of UI interaction/biometric success.
   */
  const createConsentWrapper = useCallback((actionType: ConsentActionType, payloadData: Record<string, any>): ConsentPayload => {
    return {
      consent_action_type: actionType,
      timestamp: new Date().toISOString(),
      payload: payloadData
    };
  }, []);

  /**
   * Executes a backend Edge Function with the ACA wrapper firmly attached to the request body.
   */
  const executeWithConsent = async (
    actionType: ConsentActionType,
    payloadData: Record<string, any>,
    edgeFunctionName: string
  ) => {
    const acaContext = createConsentWrapper(actionType, payloadData);

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

  return { createConsentWrapper, executeWithConsent };
};
