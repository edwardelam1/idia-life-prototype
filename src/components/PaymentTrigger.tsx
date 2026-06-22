/**
 * PaymentTrigger
 *
 * USDC payment initiation via NFC tap (iOS & Android) and WalletConnect/MetaMask.
 * - iOS: Routes NFC through the custom Swift WKWebView bridge (`initiateNfcHandshake`)
 * - Android: Routes NFC through the Capacitor IDIANFC plugin
 * - Web3: Uses WalletConnect to generate deep links intercepted by the native shell
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Nfc, Loader2, AlertTriangle, Wallet } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { isAndroid, isIOS } from '@/services/platform';
import { parsePaymentRequest, type PaymentRequest } from '@/config/usdc';
import IDIANFC from '@/plugins/nfc';
import USDCPaymentModal from './USDCPaymentModal';

// Web3Modal Imports
import { createWeb3Modal, defaultConfig, useWeb3Modal, useWeb3ModalAccount } from '@web3modal/ethers/react';

// Extend the Window object to support the custom iOS WebKit bridge
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        initiateNfcHandshake?: {
          postMessage: (payload: any) => void;
        };
      };
    };
    onNfcHandshakeComplete?: (response: any) => void;
    onNfcHandshakeError?: (error: string) => void;
  }
}

// ─── Web3Modal Configuration ───────────────────────────────────────

const projectId = '3240014e4de0b34e14e0337f7b25cb63';

// Configure Mainnet (Base)
const mainnet = {
  chainId: 8453,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org'
};

// Create a metadata object
const metadata = {
  name: 'IDIA Life',
  description: 'IDIA Sovereign Data Wallet',
  url: 'https://life.thebigidia.com', 
  icons: ['https://life.thebigidia.com/favicon.ico']
};

// Create Ethers config
const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: true,
});

// Initialize Modal (outside component to prevent re-renders)
createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId,
  enableAnalytics: false,
  themeVariables: {
    '--w3m-color-mix': '#ea580c', // Orange tint to match the UI
    '--w3m-color-mix-strength': 20
  }
});

const PaymentTrigger: React.FC = () => {
  const [isNfcListening, setIsNfcListening] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // WalletConnect Hooks
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();

  // Clean up global iOS callbacks on unmount
  useEffect(() => {
    return () => {
      if (window.onNfcHandshakeComplete) delete window.onNfcHandshakeComplete;
      if (window.onNfcHandshakeError) delete window.onNfcHandshakeError;
    };
  }, []);

  // ─── NFC Tap Handler (iOS & Android) ─────────────────────────────

  const handleNfcTap = useCallback(async () => {
    console.log('[PaymentTrigger][handleNfcTap][START] Activating NFC hardware polling');
    setNfcError(null);
    setIsNfcListening(true);

    const payloadConfig = { aca_hash: 'PAYMENT_INTENT', base_signature: 'pending_payment' };

    // --- iOS WEBKIT BRIDGE PATH ---
    if (isIOS()) {
      console.log('[PaymentTrigger][handleNfcTap][iOS] Routing to custom WebKit bridge');
      
      if (!window.webkit?.messageHandlers?.initiateNfcHandshake) {
        console.error('[PaymentTrigger][handleNfcTap][iOS_FAIL] WebKit message handler not found');
        setNfcError('iOS NFC Bridge not found. Please ensure you are running the IDIA Native App.');
        setIsNfcListening(false);
        return;
      }

      window.onNfcHandshakeComplete = (response) => {
        console.log('[PaymentTrigger][handleNfcTap][iOS_SUCCESS] Received payload from CoreNFC');
        processRawNfcPayload(response);
      };

      window.onNfcHandshakeError = (errorMsg) => {
        console.error(`[PaymentTrigger][handleNfcTap][iOS_ERROR] CoreNFC failed: ${errorMsg}`);
        if (!errorMsg.toLowerCase().includes('cancel')) {
          setNfcError(errorMsg || 'Failed to read NFC tag');
        }
        setIsNfcListening(false);
      };

      window.webkit.messageHandlers.initiateNfcHandshake.postMessage(payloadConfig);
      return;
    }

    // --- ANDROID CAPACITOR PATH ---
    if (isAndroid() && Capacitor.isNativePlatform()) {
      console.log('[PaymentTrigger][handleNfcTap][Android] Routing to Capacitor plugin');
      try {
        const result = await IDIANFC.beginHandshake({ config: payloadConfig });
        console.log('[PaymentTrigger][handleNfcTap][Android_SUCCESS] Received payload from Capacitor');
        processRawNfcPayload(result.payload);
      } catch (e: any) {
        console.error(`[PaymentTrigger][handleNfcTap][Android_ERROR] Hardware read aborted: ${e.message}`);
        if (e.message?.includes('cancelled') || e.message?.includes('cancel')) {
          setNfcError(null);
        } else if (e.message?.includes('unsupported') || e.message?.includes('disabled')) {
          setNfcError('NFC is not available or disabled. Check your device settings.');
        } else {
          setNfcError(e.message || 'Failed to read NFC tag');
        }
        setIsNfcListening(false);
      }
      return;
    }

    // --- FALLBACK ---
    console.error('[PaymentTrigger][handleNfcTap][FATAL_FAIL] Execution blocked: Unsupported platform');
    setNfcError('NFC is only available on iOS and Android mobile devices.');
    setIsNfcListening(false);

  }, []);

  const processRawNfcPayload = (rawPayload: any) => {
    console.log('[PaymentTrigger][processRawNfcPayload][START] Processing incoming NFC data block');
    try {
      const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
      console.log(`[PaymentTrigger][processRawNfcPayload] Raw structure: ${payloadStr}`);

      let extractedIntent: string;
      try {
        const nfcResult = JSON.parse(payloadStr);
        extractedIntent = nfcResult.scanned_intent || payloadStr;
      } catch {
        extractedIntent = payloadStr;
      }

      console.log('[PaymentTrigger][processRawNfcPayload] Validating standard USDC payment request');
      const parsed = parsePaymentRequest(extractedIntent);

      if (!parsed) {
        console.error('[PaymentTrigger][processRawNfcPayload][FATAL_FAIL] Parsing rejected: Invalid USDC request');
        setNfcError('This NFC tag does not contain a valid USDC payment request.');
        setIsNfcListening(false);
        return;
      }

      console.log('[PaymentTrigger][processRawNfcPayload][END:OK] Payment parsed successfully. Hydrating modal.');
      setPaymentRequest(parsed);
      setShowPaymentModal(true);
    } catch (err: any) {
      console.error(`[PaymentTrigger][processRawNfcPayload][FATAL_FAIL] Payload processing error: ${err.message}`);
      setNfcError('An error occurred while processing the NFC payload.');
    } finally {
      setIsNfcListening(false);
    }
  };

  const handlePaymentClose = useCallback(() => {
    console.log('[PaymentTrigger][handlePaymentClose][START] Teardown of active payment modal initiated');
    setShowPaymentModal(false);
    setPaymentRequest(null);
    console.log('[PaymentTrigger][handlePaymentClose][END:OK] State cleared');
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              Pay with USDC
            </CardTitle>
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              Live Mainnet
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Send live USDC payments via NFC tap or execute via Web3 wallet. No gas fees — powered by IDIA relay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* NFC Tap — Renders only on iOS or Android */}
          {(isIOS() || isAndroid()) && (
            <div className="space-y-2">
              <Button
                onClick={handleNfcTap}
                disabled={isNfcListening}
                className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white h-12"
              >
                {isNfcListening ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Waiting for NFC tap...</>
                ) : (
                  <><Nfc className="w-5 h-5 mr-2" />Tap to Pay</>
                )}
              </Button>
              {nfcError && (
                <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{nfcError}
                </div>
              )}
            </div>
          )}

          {/* Web3Modal Connection */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {!isConnected ? (
              <Button
                onClick={() => {
                  console.log("[PaymentTrigger][Web3Modal][START] User triggered Web3 connection modal");
                  open();
                }}
                variant="outline"
                className="w-full h-12 flex items-center justify-center gap-2 border-orange-200 hover:bg-orange-50 dark:border-orange-900/50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-500"
              >
                <Wallet className="w-5 h-5" /> Connect Web3 Wallet
              </Button>
            ) : (
              <div 
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => open()} // Opens modal to view balance or disconnect
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Connected
                </Badge>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Payment confirmation modal */}
      <USDCPaymentModal 
        isOpen={showPaymentModal} 
        onClose={handlePaymentClose} 
        paymentRequest={paymentRequest}
        connectedWallet={address}
      />
    </>
  );
};

export default PaymentTrigger;