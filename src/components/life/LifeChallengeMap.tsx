import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import StandingOrb from "./StandingOrb";
import mapStart from "@/assets/life-map-start.jpg";
import mapJourney from "@/assets/life-map-journey.jpg";
import mapDestination from "@/assets/life-map-destination.jpg";
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

type ChallengeKey = keyof LifeChallengeState;

type MapNode = {
  challenge: number;
  key: ChallengeKey;
  position: string;
};

type MapSection = {
  id: string;
  image: string;
  alt: string;
  nodes: MapNode[];
  destination?: boolean;
};

// New journey sections can be inserted before the destination without changing the map renderer.
const MAP_SECTIONS: MapSection[] = [
  {
    id: "destination",
    image: mapDestination,
    alt: "The illuminated IDIA house beyond a jungle challenge clearing",
    destination: true,
    nodes: [{ challenge: 5, key: "proposalVote", position: "left-[50%] top-[56%]" }],
  },
  {
    id: "journey-one",
    image: mapJourney,
    alt: "A luminous jungle path connecting two challenge clearings",
    nodes: [
      { challenge: 4, key: "dataSource", position: "left-[68%] top-[56%]" },
      { challenge: 3, key: "goodDeed", position: "left-[30%] top-[20%]" },
    ],
  },
  {
    id: "start",
    image: mapStart,
    alt: "The beginning of the Life journey through two jungle challenge clearings",
    nodes: [
      { challenge: 2, key: "connection", position: "left-[68%] top-[22%]" },
      { challenge: 1, key: "assessment", position: "left-[29%] top-[55%]" },
    ],
  },
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const houseRef = useRef<HTMLButtonElement>(null);

  const celebrateFromHouse = useCallback(() => {
    const bounds = houseRef.current?.getBoundingClientRect();
    if (!bounds) {
      fireHouseConfetti();
      return;
    }
    fireHouseConfetti({
      x: (bounds.left + bounds.width / 2) / window.innerWidth,
      y: (bounds.top + bounds.height / 2) / window.innerHeight,
    });
  }, []);

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea || allComplete) return;
    scrollArea.scrollTop = scrollArea.scrollHeight;
  }, [allComplete]);

  useEffect(() => {
    if (!allComplete || celebrated || celebrationStarted.current || loading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void onCelebrate();
      return;
    }
    celebrationStarted.current = true;
    houseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const celebrationTimer = window.setTimeout(celebrateFromHouse, 650);
    void onCelebrate().catch((error) => {
      window.clearTimeout(celebrationTimer);
      celebrationStarted.current = false;
      console.error("[LIFE_HOUSE_CELEBRATION][END:FAIL]", error);
    });
    return () => window.clearTimeout(celebrationTimer);
  }, [allComplete, celebrated, celebrateFromHouse, loading, onCelebrate]);

  return (
    <section ref={scrollAreaRef} className="relative h-full min-h-0 overflow-y-auto bg-card px-1" aria-label="Life challenge journey">
      <div className="sticky left-3 top-3 z-30 ml-2 h-0 w-fit translate-y-2 rounded-full border border-border/60 bg-background/55 p-1.5 shadow-lg backdrop-blur-md">
        <StandingOrb score={score} size={43} compact />
      </div>
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[15%] bg-card">
        {MAP_SECTIONS.map((section, sectionIndex) => (
          <div key={section.id} className={`relative aspect-square w-full ${sectionIndex > 0 ? "-mt-px" : ""}`}>
            <img
              src={section.image}
              alt={section.alt}
              width={1024}
              height={1024}
              loading={section.id === "start" ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/5 via-transparent to-background/10" aria-hidden />

            {section.destination && (
              <Button
                ref={houseRef}
                type="button"
                variant="ghost"
                disabled={!allComplete || loading}
                aria-label={allComplete ? "Enter the completed wave one house" : "Complete all five challenges to unlock the house"}
                onClick={celebrateFromHouse}
                className={`absolute left-[26%] top-[1%] z-20 h-[35%] w-[48%] rounded-[45%] border-0 bg-transparent p-0 transition-[filter,transform] hover:bg-transparent ${
                  allComplete
                    ? "drop-shadow-[0_0_20px_hsl(var(--life-amber)/0.95)] hover:scale-105"
                    : "cursor-default opacity-80 disabled:opacity-80"
                }`}
              />
            )}

            {section.nodes.map((node) => {
              const index = node.challenge - 1;
              const done = progress[node.key];
              const current = next === index;
              const enabled = done || current;
              const label = done
                ? `Challenge ${node.challenge}, complete`
                : current
                  ? `Challenge ${node.challenge}, available`
                  : `Challenge ${node.challenge}, locked`;
              const earlyNumber = node.challenge <= 3;
              return (
                <Button
                  key={node.challenge}
                  type="button"
                  variant="ghost"
                  disabled={!enabled || loading}
                  aria-label={label}
                  onClick={() => onChallenge(node.challenge)}
                  className={`absolute z-20 aspect-square h-[17%] -translate-x-1/2 -translate-y-1/2 rounded-full border p-0 text-3xl font-black transition-[filter,transform,opacity] hover:scale-105 disabled:opacity-100 ${node.position} ${
                    earlyNumber
                      ? "border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground/65 shadow-[inset_0_4px_10px_hsl(var(--primary-foreground)/0.32),inset_0_-8px_14px_hsl(var(--foreground)/0.22),0_5px_12px_hsl(var(--foreground)/0.35)] backdrop-blur-[2px]"
                      : "border-life-amber/70 bg-life-amber/75 text-life-ink shadow-[inset_0_5px_12px_hsl(var(--primary-foreground)/0.45),inset_0_-9px_14px_hsl(var(--life-amber)/0.5),0_0_18px_hsl(var(--life-amber)/0.95)]"
                  } ${current ? "motion-safe:animate-pulse" : ""} ${!enabled ? "saturate-50" : ""}`}
                >
                  <span className="drop-shadow-sm">{node.challenge}</span>
                </Button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
