import { useEffect, useMemo, useRef } from "react";
import { Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import StandingOrb from "./StandingOrb";
import jungleMap from "@/assets/life-challenge-jungle.jpg";
import idiaLogo from "@/assets/idia-hub-logo.png.asset.json";
import type { LifeChallengeState } from "@/hooks/useLifeChallengeProgress";
import { fireHouseConfetti } from "@/components/psychometric/confetti";

interface LifeChallengeMapProps {
  score: number | null | undefined;
  progress: LifeChallengeState;
  celebrated: boolean;
  loading: boolean;
  onChallenge: (challenge: number) => void;
  onCelebrate: () => Promise<void>;
}

const POSITIONS = [
  "bottom-[11%] left-[21%]",
  "bottom-[30%] right-[16%]",
  "bottom-[49%] left-[15%]",
  "bottom-[66%] right-[18%]",
  "bottom-[79%] left-[20%]",
];

export default function LifeChallengeMap({
  score,
  progress,
  celebrated,
  loading,
  onChallenge,
  onCelebrate,
}: LifeChallengeMapProps) {
  const completion = useMemo(
    () => [progress.assessment, progress.connection, progress.goodDeed, progress.dataSource, progress.proposalVote],
    [progress],
  );
  const next = completion.findIndex((done) => !done);
  const allComplete = next === -1;
  const celebrationStarted = useRef(false);

  useEffect(() => {
    if (!allComplete || celebrated || celebrationStarted.current || loading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void onCelebrate();
      return;
    }
    celebrationStarted.current = true;
    fireHouseConfetti();
    void onCelebrate();
  }, [allComplete, celebrated, loading, onCelebrate]);

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-card" aria-label="Life challenge journey">
      <img
        src={jungleMap}
        alt=""
        width={1024}
        height={1536}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/15" aria-hidden />

      <div className="absolute left-3 top-3 z-20 rounded-full border border-border/60 bg-background/55 p-1.5 shadow-lg backdrop-blur-md">
        <StandingOrb score={score} size={43} compact />
      </div>

      <img
        src={idiaLogo.url}
        alt="IDIA"
        width={84}
        height={84}
        className="absolute left-1/2 top-[3%] z-10 h-12 w-12 -translate-x-1/2 object-contain drop-shadow-lg sm:h-14 sm:w-14"
      />

      <div
        className={`absolute left-1/2 top-[11%] z-10 -translate-x-1/2 transition-all duration-700 ${
          allComplete ? "scale-110 opacity-100 drop-shadow-[0_0_18px_hsl(var(--life-amber)/0.9)]" : "opacity-70 grayscale"
        }`}
        aria-label={allComplete ? "Wave one house unlocked" : "Wave one house locked"}
      >
        <div className="relative h-10 w-14 border-x-2 border-b-2 border-life-amber bg-background/75 shadow-lg backdrop-blur-sm">
          <div className="absolute -top-4 left-1/2 h-8 w-8 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-life-amber bg-background/75" />
          <div className="absolute bottom-0 left-1/2 h-6 w-3 -translate-x-1/2 bg-life-teal" />
        </div>
      </div>

      {POSITIONS.map((position, index) => {
        const done = completion[index];
        const current = next === index;
        const enabled = done || current;
        const label = done ? `Challenge ${index + 1}, complete` : current ? `Challenge ${index + 1}, available` : `Challenge ${index + 1}, locked`;
        return (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="icon"
            disabled={!enabled || loading}
            aria-label={label}
            onClick={() => onChallenge(index + 1)}
            className={`absolute z-20 h-12 w-12 rounded-full border-2 p-0 text-base font-black shadow-xl backdrop-blur-sm transition-all ${position} ${
              done
                ? "border-life-teal bg-life-teal text-primary-foreground shadow-life-teal/40"
                : current
                  ? "border-life-amber bg-background/85 text-foreground shadow-life-amber/50 motion-safe:animate-pulse"
                  : "border-border/60 bg-background/55 text-muted-foreground opacity-75"
            }`}
          >
            {done ? <Check className="h-5 w-5" aria-hidden /> : index + 1}
            {!done && !current && <LockKeyhole className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-muted p-0.5" aria-hidden />}
          </Button>
        );
      })}
    </section>
  );
}
