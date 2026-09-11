import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HandCoins, Fingerprint, Database, Coins } from "lucide-react";
import royaltyDemo from "@/assets/royalty-demo.mov.asset.json";

interface RoyaltyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Database,
    title: "Tap a data source",
    description: "Choose Apple Health, Health Connect, or FordConnect from the available connections.",
  },
  {
    icon: Fingerprint,
    title: "Grant access",
    description: "Allow permissions or sign in to the account linked to that source.",
  },
  {
    icon: Database,
    title: "Data flows automatically",
    description: "Once connected, your data streams securely to the IDIA Hub.",
  },
  {
    icon: Coins,
    title: "Earn royalties",
    description: "When your data is consumed, you automatically receive USDC and IDIA Token payouts.",
  },
];

const RoyaltyInfoModal = ({ isOpen, onClose }: RoyaltyInfoModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isOpen) {
      video.currentTime = 0;
      video.play().catch(() => {
        // Autoplay may be blocked; silent failure is acceptable.
      });
    } else {
      video.pause();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-[2rem] bg-background border-border p-0 overflow-hidden gap-0">
        <div className="relative aspect-[9/16] max-h-[320px] bg-black overflow-hidden">
          <video
            ref={videoRef}
            src={royaltyDemo.url}
            className="w-full h-full object-cover"
            muted
            playsInline
            loop
            preload="auto"
            aria-label="How to generate royalties demo"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background pointer-events-none" />
        </div>

        <div className="p-6 -mt-8 relative z-10">
          <DialogHeader className="text-center space-y-2 mb-4">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
              How to Generate Royalties
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Connect your data sources and start earning automatically when your data is consumed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mb-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50"
                >
                  <div className="shrink-0 w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {step.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-black tracking-wide"
          >
            <HandCoins className="w-4 h-4 mr-2" />
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoyaltyInfoModal;
