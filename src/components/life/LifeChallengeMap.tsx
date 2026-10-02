import { useEffect, useMemo, useRef } from "react";
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
  "left-[34%] top-[81%]",
  "left-[69%] top-[64%]",
  "left-[34%] top-[48%]",
  "left-[66%] top-[35%]",
  "left-[38%] top-[22%]",
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
    void onCelebrate().catch((error) => {
      celebrationStarted.current = false;
      console.error("[LIFE_HOUSE_CELEBRATION][END:FAIL]", error);
    });
  }, [allComplete, celebrated, loading, onCelebrate]);

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-card" aria-label="Life challenge journey">
      <div className="relative mx-auto aspect-[2/3] w-full max-w-2xl overflow-hidden">
        <img
          src={jungleMap}
          alt="An illuminated jungle path winding through five challenge clearings to the IDIA house"
          width={1024}
          height={1536}
          className="absolute inset-0 h-full w-full select-none object-cover"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/15" aria-hidden />

        <div className="absolute left-3 top-3 z-20 rounded-full border border-border/60 bg-background/55 p-1.5 shadow-lg backdrop-blur-md">
          <StandingOrb score={score} size={43} compact />
        </div>

        <img
          src={idiaLogo.url}
          alt="IDIA"
          width={84}
          height={84}
          className="pointer-events-none absolute left-1/2 top-[3%] z-10 h-12 w-12 -translate-x-1/2 object-contain drop-shadow-lg sm:h-14 sm:w-14"
        />

        <Button
          type="button"
          variant="ghost"
          disabled={!allComplete || loading}
          aria-label={allComplete ? "Enter the completed wave one house" : "Complete all five challenges to unlock the house"}
          onClick={fireHouseConfetti}
          className={`absolute left-[34%] top-[2%] z-20 h-[17%] w-[32%] rounded-none border-0 bg-transparent p-0 transition-[filter,transform] hover:bg-transparent ${
            allComplete
              ? "drop-shadow-[0_0_20px_hsl(var(--life-amber)/0.95)] hover:scale-105"
              : "cursor-default opacity-80 disabled:opacity-80"
          }`}
        />

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
              disabled={!enabled || loading}
              aria-label={label}
              onClick={() => onChallenge(index + 1)}
              className={`absolute z-20 h-[12%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-0 bg-transparent p-0 text-2xl font-black transition-[filter,transform,opacity] hover:bg-transparent ${position} ${
                done
                  ? "text-primary-foreground drop-shadow-[0_2px_6px_hsl(var(--life-teal))]"
                  : current
                    ? "text-foreground drop-shadow-[0_2px_7px_hsl(var(--life-amber))] motion-safe:animate-pulse"
                    : "text-muted-foreground opacity-70 disabled:opacity-70"
              }`}
            >
              {index + 1}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
