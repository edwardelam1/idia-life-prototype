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
    // Listen for the Native Bridge to return success
    (window as any).onNfcHandshakeComplete = (peerToken: string) => {
      console.log("📱 [NFC_BRIDGE_SUCCESS] Peer Token:", peerToken);
      
      // Placeholder: In production, resolve peerColor from the token via Supabase
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
    console.log("📱 [NFC_BRIDGE_START] Triggering Native iOS Hardware");

    try {
      // Direct call to the Swift Coordinator message handler
      if (window.webkit?.messageHandlers?.initiateNfcHandshake) {
        window.webkit.messageHandlers.initiateNfcHandshake.postMessage({
          handshake_token: "IDIA_SOCIAL_SYNC_REQUEST"
        });
        toast({ title: "NFC Active", description: "Hold devices together to Sync." });
      } else {
        throw new Error("Native hardware bridge not detected.");
      }
    } catch (err: any) {
      console.warn("🚨 [NFC_BRIDGE_FAIL]", err);
      toast({ 
        title: "Hardware Unavailable", 
        description: "Please use the IDIA Native App for NFC Syncing.", 
        variant: "destructive" 
      });
      setScanning(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={initiateHandshake} disabled={scanning} className="bg-teal-600 hover:bg-teal-700">
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