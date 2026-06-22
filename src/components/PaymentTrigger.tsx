/**
 * PaymentTrigger (USDC Send & Receive)
 *
 * USDC wallet interface for sending and receiving funds.
 * - NFC: Routes through the custom Swift WKWebView bridge (`initiateNfcHandshake`) or Capacitor.
 * - Web3: Uses direct deep link bridges to securely bounce the user into MetaMask.
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Nfc, Loader2, AlertTriangle, Send, QrCode, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { isAndroid, isIOS } from '@/services/platform';
import { parsePaymentRequest, type PaymentRequest } from '@/config/usdc';
import IDIANFC from '@/plugins/nfc';
import USDCPaymentModal from './USDCPaymentModal';

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

const PaymentTrigger: React.FC = () => {
  const [isNfcListening, setIsNfcListening] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Clean up global iOS callbacks on unmount
  useEffect(() => {
    return () => {
      if (window.onNfcHandshakeComplete) delete window.onNfcHandshakeComplete;
      if (window.onNfcHandshakeError) delete window.onNfcHandshakeError;
    };
  }, []);

  // ─── Deep Link Bridge ──────────────────────────────────────────────

  const openMetaMaskWallet = () => {
    console.log("[PaymentTrigger][DeepLink][START] Routing user to MetaMask dApp browser");
    // This utilizes the Universal Link. If MetaMask is installed, iOS intercepts it and opens the app.
    // Inside the MetaMask browser, window.ethereum is fully injected and available.
    window.location.href = "https://metamask.app.link/dapp/life.thebigidia.com";
  };

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
      
      let extractedIntent: string;
      try {
        const nfcResult = JSON.parse(payloadStr);
        extractedIntent = nfcResult.scanned_intent || payloadStr;
      } catch {
        extractedIntent = payloadStr;
      }

      const parsed = parsePaymentRequest(extractedIntent);

      if (!parsed) {
        console.error('[PaymentTrigger][processRawNfcPayload][FATAL_FAIL] Parsing rejected: Invalid USDC request');
        setNfcError('This NFC tag does not contain a valid USDC request.');
        setIsNfcListening(false);
        return;
      }

      console.log('[PaymentTrigger][processRawNfcPayload][END:OK] Payload parsed successfully. Hydrating modal.');
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
    setShowPaymentModal(false);
    setPaymentRequest(null);
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              Send & Receive USDC
            </CardTitle>
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              Live Mainnet
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Manage your USDC balance on Base. Use NFC for in-person transfers or open your secure wallet to send and receive.
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
                  <><Nfc className="w-5 h-5 mr-2" />NFC Tap to Transfer</>
                )}
              </Button>
              {nfcError && (
                <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{nfcError}
                </div>
              )}
            </div>
          )}

          {/* Direct Wallet Deep Links */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={openMetaMaskWallet}
              variant="outline"
              className="h-12 flex flex-col items-center justify-center gap-1 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Send className="w-4 h-4" />
                <span className="font-semibold">Send</span>
              </div>
            </Button>
            
            <Button
              onClick={openMetaMaskWallet}
              variant="outline"
              className="h-12 flex flex-col items-center justify-center gap-1 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <QrCode className="w-4 h-4" />
                <span className="font-semibold">Receive</span>
              </div>
            </Button>
          </div>
          
          <Button
            onClick={openMetaMaskWallet}
            variant="ghost"
            className="w-full text-xs text-muted-foreground hover:text-orange-600 dark:hover:text-orange-500"
          >
            Open in MetaMask <ExternalLink className="w-3 h-3 ml-1" />
          </Button>

        </CardContent>
      </Card>

      {/* Payment confirmation modal */}
      <USDCPaymentModal 
        isOpen={showPaymentModal} 
        onClose={handlePaymentClose} 
        paymentRequest={paymentRequest}
      />
    </>
  );
};

export default PaymentTrigger;