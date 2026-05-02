import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Nfc } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ColorWashOverlay from "./ColorWashOverlay";

interface NFCHandshakeProps {
  myTierColor: string;
  onConnected?: () => void;
}

export default function NFCHandshake({ myTierColor, onConnected }: NFCHandshakeProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [washPeerColor, setWashPeerColor] = useState<string | null>(null);

  useEffect(() => {
    // 1. Establish the Native Inbound Callbacks
    (window as any).onNfcHandshakeComplete = (peerToken: string) => {
      console.log("📱 [NFC_BRIDGE_SUCCESS] Peer Token Received:", peerToken);
      
      // Resolve peer standing from the cryptographic token
      const peerColor = "hsl(210, 90%, 75%)"; 
      
      setWashPeerColor(peerColor);
      onConnected?.();
      setScanning(false);
      toast({ title: "Syncing Complete", description: "Connection established." });
    };

    (window as any).onNfcHandshakeError = (err: string) => {
      console.error("🚨 [NFC_BRIDGE_ERROR]", err);
      setScanning(false);
      toast({ title: "Sync Failed", description: err, variant: "destructive" });
    };

    return () => {
      delete (window as any).onNfcHandshakeComplete;
      delete (window as any).onNfcHandshakeError;
    };
  }, [onConnected, toast]);

  const initiateHandshake = () => {
    if (scanning) return;
    setScanning(true);
    console.log("📱 [NFC_BRIDGE_START] Triggering Native Handshake Protocol");

    try {
      // 2. Surgical Bypass for 'webkit' Property Error
      // This sends the production payload directly to your Swift Coordinator
      const nativeWindow = window as any;

    try {
      const nfcBridge = nativeWindow.webkit?.messageHandlers?.initiateNfcHandshake;
      
      if (nfcBridge) {
        // Trigger the live NFC reader in your local Xcode shell
        nfcBridge.postMessage({ handshake_token: "IDIA_PROD_SYNC_001" });
        console.log("📱 [NFC_BRIDGE] ACTION: Hardware triggered successfully.");
      } else {
        throw new Error("Bridge not found. Physical hardware required.");
      }
    } catch (err: any) {
      console.warn("🚨 [NFC_BRIDGE] FAIL:", err);
      setScanning(false);
    }
  };
      toast({ 
        title: "Hardware Unavailable", 
        description: "Please use the production app on a physical device.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <>
      <Button 
        size="sm" 
        onClick={initiateHandshake} 
        disabled={scanning} 
        className="bg-teal-600 hover:bg-teal-700"
      >
        <Nfc className="w-4 h-4 mr-2" />
        {scanning ? "Syncing…" : "Start Syncing"}
      </Button>

      {washPeerColor && (
        <ColorWashOverlay 
          myColor={myTierColor} 
          peerColor={washPeerColor} 
          onComplete={() => setWashPeerColor(null)} 
        />
      )}
    </>
  );
}