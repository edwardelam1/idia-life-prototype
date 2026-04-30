import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * useNFCBridge — IDIA Sovereign Handshake Bridge
 *
 * Bridges the React UI to the native iOS WebKit message handler responsible
 * for the physical NFC handshake. Maintains a graceful web fallback and
 * re-broadcasts native callbacks as CustomEvents so multiple components
 * (Life now, Vote/PACE later) can subscribe without colliding on the
 * window globals.
 */

export type NFCBridgeMode = "STANDARD" | "PACE";

interface NFCWindow extends Window {
  webkit?: {
    messageHandlers?: {
      initiateNfcScan?: { postMessage: (msg: unknown) => void };
    };
  };
  onNfcScanComplete?: (peerToken: string) => void;
  onNfcScanError?: (error: string) => void;
}

const detectBridge = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as NFCWindow;
  return Boolean(w.webkit?.messageHandlers?.initiateNfcScan?.postMessage);
};

export function useNFCBridge() {
  const [isBridgeAvailable, setIsBridgeAvailable] = useState<boolean>(() => detectBridge());
  const [isScanning, setIsScanning] = useState(false);
  const scanningRef = useRef(false);

  // ---- Listener installation (paired logging) -----------------------------
  useEffect(() => {
    console.log("[BRIDGE_INIT_START]");
    setIsBridgeAvailable(detectBridge());

    console.log("[BRIDGE_LISTENER_INIT_START]");
    const w = window as NFCWindow;

    const completeHandler = (peerToken: string) => {
      console.log("[BRIDGE_SCAN_COMPLETE]", { tokenLength: peerToken?.length ?? 0 });
      scanningRef.current = false;
      setIsScanning(false);
      window.dispatchEvent(
        new CustomEvent("nfc:scan-complete", { detail: { peerToken } })
      );
    };

    const errorHandler = (error: string) => {
      console.log("[BRIDGE_SCAN_ERROR]", { error });
      scanningRef.current = false;
      setIsScanning(false);
      window.dispatchEvent(
        new CustomEvent("nfc:scan-error", { detail: { error } })
      );
    };

    w.onNfcScanComplete = completeHandler;
    w.onNfcScanError = errorHandler;

    console.log("[BRIDGE_LISTENER_INIT_END]");

    return () => {
      console.log("[BRIDGE_LISTENER_TEARDOWN_START]");
      const cleanup = window as NFCWindow;
      if (cleanup.onNfcScanComplete === completeHandler) cleanup.onNfcScanComplete = undefined;
      if (cleanup.onNfcScanError === errorHandler) cleanup.onNfcScanError = undefined;
      console.log("[BRIDGE_LISTENER_TEARDOWN_END]");
      console.log("[BRIDGE_INIT_END]");
    };
  }, []);

  // ---- Outbound: initiate handshake ---------------------------------------
  const initiateSovereignHandshake = useCallback(
    (mode: NFCBridgeMode = "STANDARD") => {
      console.log("[BRIDGE_HANDSHAKE_START]", { mode });

      if (scanningRef.current) {
        console.log("[BRIDGE_HANDSHAKE_END]", { reason: "already_scanning" });
        return;
      }

      const w = window as NFCWindow;
      const handler = w.webkit?.messageHandlers?.initiateNfcScan;

      if (!handler?.postMessage) {
        toast("Hardware not available", {
          description:
            "Please open IDIA Life on your mobile device to activate the physical handshake hardware.",
        });
        console.log("[BRIDGE_HANDSHAKE_END]", { reason: "bridge_missing" });
        return;
      }

      try {
        scanningRef.current = true;
        setIsScanning(true);
        handler.postMessage({ action: "start_scan", mode });
        console.log("[BRIDGE_HANDSHAKE_END]", { dispatched: true });
      } catch (err) {
        scanningRef.current = false;
        setIsScanning(false);
        console.log("[BRIDGE_HANDSHAKE_END]", { error: String(err) });
        toast("Could not start handshake", {
          description: "Please try again in a moment.",
        });
      }
    },
    []
  );

  return { isBridgeAvailable, isScanning, initiateSovereignHandshake };
}
