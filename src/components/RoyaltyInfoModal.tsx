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
    title: "Tap a Data Source",
    description: "Choose Apple Health, Health Connect, or FordConnect from the available connections.",
  },
  {
    icon: Fingerprint,
    title: "Grant Access",
    description: "Allow permissions or sign in to the account linked to that source.",
  },
  {
    icon: Database,
    title: "Data Flows Automatically",
    description: "Once connected, your data streams securely to the IDIA Hub.",
  },
  {
    icon: Coins,
    title: "Earn Royalties",
    description: "When your data is consumed, you automatically receive USDC and IDIA Token payouts.",
  },
];

const RoyaltyInfoModal = ({ isOpen, onClose }: RoyaltyInfoModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isOpen) {
      video.pause();
      return;
    }

    // iOS only honours autoplay when these live on the element itself before the
    // source starts loading, so set them imperatively rather than via props.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("autoplay", "");

    const attempt = () => {
      video.play().catch(() => {
        // Autoplay may still be blocked (e.g. iOS Low Power Mode); stay silent.
      });
    };

    try {
      video.currentTime = 0;
    } catch {
      // currentTime may not be settable before metadata loads.
    }
    attempt();

    const onVisibility = () => {
      if (document.visibilityState === "visible") attempt();
    };

    video.addEventListener("loadeddata", attempt);
    video.addEventListener("canplay", attempt);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      video.removeEventListener("loadeddata", attempt);
      video.removeEventListener("canplay", attempt);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] rounded-[2rem] bg-background border-border p-5 overflow-y-auto gap-0">
        <DialogHeader className="text-center space-y-1 mb-3">
          <DialogTitle className="text-xl font-black tracking-tight text-foreground text-center">
            How to Generate Royalties
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center">
            Connect your data sources and start earning automatically when your data is consumed.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-1 text-center mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={index} className="text-xs text-muted-foreground leading-snug">
                <span className="inline-flex items-center gap-1.5 text-foreground font-semibold">
                  <Icon className="w-3.5 h-3.5 text-teal-600" />
                  {step.title}:
                </span>{" "}
                {step.description}
              </li>
            );
          })}
        </ol>

        <div className="relative w-full max-h-[180px] bg-black rounded-2xl overflow-hidden mb-4 mx-auto">
          <video
            ref={videoRef}
            src={royaltyDemo.url}
            className="w-full h-full max-h-[180px] object-contain mx-auto"
            muted
            playsInline
            loop
            preload="auto"
            aria-label="How to generate royalties demo"
          />
        </div>

        <Button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-black tracking-wide"
        >
          <HandCoins className="w-4 h-4 mr-2" />
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default RoyaltyInfoModal;
