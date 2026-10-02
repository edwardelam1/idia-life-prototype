import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface LifeAchievementNoticeProps {
  challenge: number;
  onDismiss: () => void;
}

type ExitDirection = "left" | "right" | "pop" | null;

const SWIPE_THRESHOLD = 72;

export default function LifeAchievementNotice({ challenge, onDismiss }: LifeAchievementNoticeProps) {
  const [dragX, setDragX] = useState(0);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);
  const pointerStart = useRef<{ id: number; x: number } | null>(null);
  const moved = useRef(false);

  const dismiss = useCallback(
    (direction: Exclude<ExitDirection, null>) => {
      if (exitDirection) return;
      setExitDirection(direction);
      window.setTimeout(onDismiss, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
    },
    [exitDirection, onDismiss],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss("pop"), 5000);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  const exitClass =
    exitDirection === "left"
      ? "-translate-x-[120vw] opacity-0"
      : exitDirection === "right"
        ? "translate-x-[120vw] opacity-0"
        : exitDirection === "pop"
          ? "scale-125 opacity-0"
          : "animate-scale-in";

  return (
    <div className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center">
      <Button
        type="button"
        variant="outline"
        aria-label={`Life Achievement Unlocked, challenge ${challenge}. Tap or swipe to dismiss.`}
        onClick={() => {
          if (!moved.current) dismiss("pop");
          moved.current = false;
        }}
        onPointerDown={(event) => {
          pointerStart.current = { id: event.pointerId, x: event.clientX };
          moved.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (pointerStart.current?.id !== event.pointerId || exitDirection) return;
          const distance = event.clientX - pointerStart.current.x;
          if (Math.abs(distance) > 8) moved.current = true;
          setDragX(distance);
        }}
        onPointerUp={(event) => {
          if (pointerStart.current?.id !== event.pointerId || exitDirection) return;
          pointerStart.current = null;
          if (Math.abs(dragX) >= SWIPE_THRESHOLD) {
            dismiss(dragX < 0 ? "left" : "right");
            return;
          }
          setDragX(0);
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          moved.current = false;
          setDragX(0);
        }}
        className={`pointer-events-auto h-auto min-h-24 w-full max-w-md touch-pan-y whitespace-normal rounded-lg border-2 border-life-amber/80 bg-background/90 px-6 py-5 text-center shadow-[0_0_28px_hsl(var(--life-amber)/0.48)] backdrop-blur-xl transition-[transform,opacity] duration-200 motion-reduce:transition-none ${exitClass}`}
        style={{ transform: exitDirection ? undefined : `translateX(${dragX}px)` }}
      >
        <span className="text-balance text-2xl font-black leading-tight text-foreground sm:text-3xl">
          Life Achievement Unlocked
        </span>
      </Button>
    </div>
  );
}