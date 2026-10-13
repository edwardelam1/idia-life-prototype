import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, Database, Coins, X } from "lucide-react";
import royaltyDemo from "@/assets/royalty-demo.mp4.asset.json";

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
  const [videoExpanded, setVideoExpanded] = useState(false);
  const videoOpenerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isOpenRef = useRef(isOpen);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const retryTimersRef = useRef<number[]>([]);

  isOpenRef.current = isOpen;

  const returnToPopup = useCallback(() => {
    setVideoExpanded(false);
    requestAnimationFrame(() => videoOpenerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) setVideoExpanded(false);
  }, [isOpen]);

  useEffect(() => {
    if (videoExpanded) closeButtonRef.current?.focus();
  }, [videoExpanded]);

  const clearRetries = useCallback(() => {
    retryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    retryTimersRef.current = [];
  }, []);

  const attemptPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isOpenRef.current || !video.paused || video.ended || playPromiseRef.current) return;

    video.muted = true;
    video.defaultMuted = true;
    const playPromise = video.play();
    playPromiseRef.current = playPromise;
    playPromise
      .catch(() => {
        // A later media event or bounded retry may succeed once WebKit is ready.
      })
      .finally(() => {
        if (playPromiseRef.current === playPromise) playPromiseRef.current = null;
      });
  }, []);

  const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (!video) return;

    // WebKit evaluates autoplay eligibility as soon as src is assigned. Apply
    // every required muted/inline attribute before allowing the MP4 to load.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("preload", "auto");
    video.src = royaltyDemo.url;

    if (isOpenRef.current) queueMicrotask(attemptPlayback);
  }, [attemptPlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isOpen) {
      clearRetries();
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // currentTime may not be settable before metadata loads.
      }
      return;
    }

    try {
      video.currentTime = 0;
    } catch {
      // currentTime may not be settable before metadata loads.
    }
    attemptPlayback();

    [150, 450, 900].forEach((delay) => {
      retryTimersRef.current.push(window.setTimeout(attemptPlayback, delay));
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") attemptPlayback();
    };

    video.addEventListener("loadedmetadata", attemptPlayback);
    video.addEventListener("loadeddata", attemptPlayback);
    video.addEventListener("canplay", attemptPlayback);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearRetries();
      video.removeEventListener("loadedmetadata", attemptPlayback);
      video.removeEventListener("loadeddata", attemptPlayback);
      video.removeEventListener("canplay", attemptPlayback);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [attemptPlayback, clearRetries, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-foreground/35 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[101] flex items-center justify-center outline-none"
          aria-label={videoExpanded ? "Royalties video" : "How to Generate Royalties"}
          onEscapeKeyDown={(event) => {
            if (videoExpanded) {
              event.preventDefault();
              returnToPopup();
            }
          }}
          onPointerDown={(event) => {
            if (!videoExpanded && event.target === event.currentTarget) onClose();
          }}
        >
        <section className={videoExpanded
          ? "relative flex h-full w-full flex-col bg-life-ink p-0"
          : "royalty-glass-panel relative mx-4 max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top))-max(1rem,env(safe-area-inset-bottom)))] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg border border-life-amber/55 bg-background/90 p-5 backdrop-blur-xl touch-pan-y"
        }>
        <header className={videoExpanded ? "hidden" : "text-center"}>
          <p className="text-[10px] font-semibold uppercase text-life-amber">Life by IDIA</p>
          <DialogTitle className="mt-1 text-2xl font-black leading-tight text-foreground text-center">
            How to Generate Royalties
          </DialogTitle>
          <DialogDescription className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground text-center">
            Connect your data sources and start earning automatically when your data is consumed.
          </DialogDescription>
        </header>

        <ol className={videoExpanded ? "hidden" : "mt-5 divide-y divide-border/60 border-y border-border/60 text-left"}>
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={index} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-life-teal/35 bg-life-teal/10 text-life-teal">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className={videoExpanded
          ? "relative flex min-h-0 flex-1 items-center justify-center pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          : "relative mx-auto mt-5 h-[180px] w-full overflow-hidden rounded-lg bg-life-ink"
        }>
          <video
            ref={setVideoRef}
            className="mx-auto h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            loop
            preload="auto"
            aria-label="How to generate royalties demo"
          />
          <Button
            ref={videoOpenerRef}
            type="button"
            variant="ghost"
            aria-label="Enlarge royalties video"
            className={videoExpanded ? "hidden" : "absolute inset-0 h-full w-full rounded-lg p-0 hover:bg-transparent focus-visible:ring-inset"}
            onClick={() => setVideoExpanded(true)}
          />
        </div>

        <Button
          ref={closeButtonRef}
          type="button"
          size="icon"
          variant="secondary"
          aria-label={videoExpanded ? "Return to royalties pop-up" : "Close royalties pop-up"}
          title={videoExpanded ? "Return to royalties pop-up" : "Close"}
          className={videoExpanded
            ? "absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-10 rounded-full"
            : "absolute right-2 top-2 h-7 w-7 rounded-full bg-background/80"
          }
          onClick={videoExpanded ? returnToPopup : onClose}
        >
          <X aria-hidden="true" />
        </Button>

        <Button
          onClick={onClose}
          type="button"
          className={videoExpanded ? "hidden" : "mt-5 w-full"}
        >
          Got it
        </Button>
        </section>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default RoyaltyInfoModal;
