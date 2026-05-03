import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";

export type NFCBridgeMode = "STANDARD" | "PACE";

interface NFCWindow extends Window {
  webkit?: {
    messageHandlers?: {
      // Corrected to match the working Payroll/Handshake components
      initiateNfcHandshake?: { postMessage: (msg: unknown) => void };
    };
  };
  // Corrected to match the native Swift callback targets
  onNfcHandshakeComplete?: (peerToken: string) => void;
  onNfcHandshakeError?: (error: string) => void;
}

const detectBridge = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as NFCWindow;
  // Look for initiateNfcHandshake instead of initiateNfcScan
  return Boolean(w.webkit?.messageHandlers?.initiateNfcHandshake?.postMessage);
};

export function useNFCBridge() {
  const [isBridgeAvailable, setIsBridgeAvailable] = useState<boolean>(() => detectBridge());
  const [isScanning, setIsScanning] = useState(false);
  const scanningRef = useRef(false);

  useEffect(() => {
    console.log("[BRIDGE_INIT_START]");
    setIsBridgeAvailable(detectBridge());

    console.log("[BRIDGE_LISTENER_INIT_START]");
    const w = window as NFCWindow;

    // Standardized callback that the native iOS side actually calls
    const completeHandler = (peerToken: string) => {
      console.log("[BRIDGE_NATIVE_CALLBACK_RECEIVED_START]");
      console.log("[BRIDGE_HANDSHAKE_COMPLETE]", { tokenLength: peerToken?.length ?? 0 });
      scanningRef.current = false;
      setIsScanning(false);
      
      window.dispatchEvent(
        new CustomEvent("nfc:scan-complete", { detail: { peerToken } })
      );
      console.log("[BRIDGE_NATIVE_CALLBACK_RECEIVED_END]");
    };

    const errorHandler = (error: string) => {
      console.log("[BRIDGE_NATIVE_ERROR_RECEIVED_START]");
      console.log("[BRIDGE_HANDSHAKE_ERROR]", { error });
      scanningRef.current = false;
      setIsScanning(false);
      
      window.dispatchEvent(
        new CustomEvent("nfc:scan-error", { detail: { error } })
      );
      console.log("[BRIDGE_NATIVE_ERROR_RECEIVED_END]");
    };

    // Attach to the specific window globals expected by your Swift Coordinator
    w.onNfcHandshakeComplete = completeHandler;
    w.onNfcHandshakeError = errorHandler;

    console.log("[BRIDGE_LISTENER_INIT_END]");

    return () => {
      console.log("[BRIDGE_LISTENER_TEARDOWN_START]");
      const cleanup = window as NFCWindow;
      if (cleanup.onNfcHandshakeComplete === completeHandler) cleanup.onNfcHandshakeComplete = undefined;
      if (cleanup.onNfcHandshakeError === errorHandler) cleanup.onNfcHandshakeError = undefined;
      console.log("[BRIDGE_LISTENER_TEARDOWN_END]");
      console.log("[BRIDGE_INIT_END]");
    };
  }, []);

  const initiateSovereignHandshake = useCallback(
    (mode: NFCBridgeMode = "STANDARD") => {
      console.log("[BRIDGE_HANDSHAKE_START]", { mode });

      if (scanningRef.current) {
        console.warn("[BRIDGE_HANDSHAKE_ABORTED] Already scanning");
        return;
      }

      const w = window as NFCWindow;
      // Updated to match the handler that worked in your Payroll log
      const handler = w.webkit?.messageHandlers?.initiateNfcHandshake;

      if (!handler?.postMessage) {
        console.error("[BRIDGE_HANDSHAKE_FAILED] initiateNfcHandshake handler missing");
        toast("Hardware not available", {
          description: "Please open IDIA Life on your mobile device to activate the physical handshake hardware.",
        });
        return;
      }

      try {
        scanningRef.current = true;
        setIsScanning(true);
        
        console.log("[BRIDGE_IPC_DISPATCH_START]");
        // Aligning payload structure with NFCPayrollModal
        handler.postMessage({ 
          action: "start_scan", 
          mode, 
          handshake_token: mode === "STANDARD" ? "IDIA_LIFE_SYNC_001" : "IDIA_PACE_SYNC_001" 
        });
        console.log("[BRIDGE_IPC_DISPATCH_END]");
        
      } catch (err) {
        scanningRef.current = false;
        setIsScanning(false);
        console.error("[BRIDGE_HANDSHAKE_CRASH]", { error: String(err) });
        toast("Could not start handshake", {
          description: "Please try again in a moment.",
        });
      }
    },
    []
  );

  return { isBridgeAvailable, isScanning, initiateSovereignHandshake };
}