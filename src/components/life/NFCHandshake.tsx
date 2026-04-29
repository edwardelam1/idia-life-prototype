import { useState } from "react";
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

  const initiateHandshake = async () => {
    if (scanning) return;
    setScanning(true);
    console.log("[NFC_HANDSHAKE_START]");

    try {
      // Web NFC path (Android Chrome only)
      const NDEFReaderCtor = (window as any).NDEFReader;
      if (NDEFReaderCtor) {
        const reader = new NDEFReaderCtor();
        await reader.scan();
        toast({ title: "Bring devices together", description: "Hold the phones back-to-back to complete the handshake." });

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("nfc_timeout")), 15000);
          reader.onreading = () => {
            clearTimeout(timeout);
            resolve();
          };
          reader.onreadingerror = () => {
            clearTimeout(timeout);
            reject(new Error("nfc_read_error"));
          };
        });
      } else {
        // Unsupported platform: physical-only protocol means no manual fallback.
        toast({
          title: "NFC required",
          description: "Connections require physical proximity via NFC. Use the iOS/Android app to tap.",
        });
        console.log("[NFC_HANDSHAKE_UNSUPPORTED]");
        return;
      }

      // On success, trigger the fluid color wash blending both standings
      const peerColor = "hsl(210, 90%, 75%)"; // peer color resolved from handshake payload (placeholder until peer telemetry wired)
      setWashPeerColor(peerColor);
      onConnected?.();
      console.log("[NFC_HANDSHAKE_SUCCESS]");
    } catch (err) {
      console.warn("[NFC_HANDSHAKE_FAIL]", err);
      toast({ title: "Handshake cancelled", description: "No connection was made." });
    } finally {
      setScanning(false);
      console.log("[NFC_HANDSHAKE_END]");
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
        {scanning ? "Listening…" : "Tap to Connect"}
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
