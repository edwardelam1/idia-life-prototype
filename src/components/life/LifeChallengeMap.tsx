import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import StandingOrb from "./StandingOrb";
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
  x: number;
  y: number;
  position: string;
};

// Every stop is measured in the same 600 × 1800 coordinate space as the road.
const MAP_NODES: MapNode[] = [
  { challenge: 5, key: "proposalVote", x: 50, y: 16.67, position: "left-[50%] top-[16.67%]" },
  { challenge: 4, key: "dataSource", x: 70, y: 33.89, position: "left-[70%] top-[33.89%]" },
  { challenge: 3, key: "goodDeed", x: 30, y: 50, position: "left-[30%] top-[50%]" },
  { challenge: 2, key: "connection", x: 68.33, y: 66.67, position: "left-[68.33%] top-[66.67%]" },
  { challenge: 1, key: "assessment", x: 31.67, y: 83.33, position: "left-[31.67%] top-[83.33%]" },
];

// Static presentation copy for the current-challenge pop-up.
// The actions themselves stay in LifeScreen via onChallenge.
const CHALLENGE_INFO: Record<number, { title: string; description: string }> = {
  1: { title: "Assessment", description: "Complete your psychometric assessment to establish your standing." },
  2: { title: "Connection", description: "Make a real Connection: sync with someone in person, or enter their GUID." },
  3: { title: "Good Deed", description: "Submit a Good Deed you witnessed for verification." },
  4: { title: "Data Source", description: "Attach one data source to your profile." },
  5: { title: "Proposal Vote", description: "Vote on an active governance proposal." },
};

function LifeTerrain() {
  return (
    <svg
      viewBox="0 0 600 1800"
      role="img"
      aria-label="A continuous jungle terrain with one winding illuminated road"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="terrain-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--life-terrain-deep))" />
          <stop offset="0.5" stopColor="hsl(var(--life-terrain))" />
          <stop offset="1" stopColor="hsl(var(--life-terrain-deep))" />
        </linearGradient>
        <linearGradient id="river-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="hsl(var(--life-water-deep))" />
          <stop offset="0.5" stopColor="hsl(var(--life-water))" />
          <stop offset="1" stopColor="hsl(var(--life-water-deep))" />
        </linearGradient>
        <linearGradient id="road-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="hsl(var(--life-road-edge))" />
          <stop offset="0.5" stopColor="hsl(var(--life-road))" />
          <stop offset="1" stopColor="hsl(var(--life-road-edge))" />
        </linearGradient>
        <filter id="road-glow" x="-35%" y="-10%" width="170%" height="120%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <pattern id="contours" width="74" height="74" patternUnits="userSpaceOnUse">
          <path d="M-10 24 Q 18 2 47 22 T 84 18" fill="none" stroke="hsl(var(--life-contour))" strokeWidth="2" opacity="0.32" />
          <path d="M-8 55 Q 21 37 48 56 T 84 51" fill="none" stroke="hsl(var(--life-contour))" strokeWidth="1.5" opacity="0.2" />
        </pattern>
      </defs>

      <rect width="600" height="1800" fill="url(#terrain-depth)" />

      <path
        d="M0 0H130C146 138 104 246 124 382C146 526 98 646 116 790C136 944 86 1062 106 1212C127 1370 83 1518 120 1800H0Z"
        fill="hsl(var(--life-terrain-bank))"
      />
      <path
        d="M600 0H476C451 143 497 276 475 415C454 552 506 699 480 840C455 982 511 1132 485 1280C458 1430 504 1592 474 1800H600Z"
        fill="hsl(var(--life-terrain-bank))"
      />
      <rect width="600" height="1800" fill="url(#contours)" />

      <path
        d="M74 0C90 148 54 275 78 425C103 584 61 730 84 886C106 1035 63 1180 90 1335C112 1466 79 1612 97 1800"
        fill="none"
        stroke="hsl(var(--life-water-bank))"
        strokeWidth="62"
        strokeLinecap="round"
      />
      <path
        d="M74 0C90 148 54 275 78 425C103 584 61 730 84 886C106 1035 63 1180 90 1335C112 1466 79 1612 97 1800"
        fill="none"
        stroke="url(#river-light)"
        strokeWidth="42"
        strokeLinecap="round"
      />
      <path
        d="M526 0C508 152 548 292 520 446C496 582 542 742 515 897C490 1040 538 1198 510 1345C486 1475 526 1624 503 1800"
        fill="none"
        stroke="hsl(var(--life-water-bank))"
        strokeWidth="62"
        strokeLinecap="round"
      />
      <path
        d="M526 0C508 152 548 292 520 446C496 582 542 742 515 897C490 1040 538 1198 510 1345C486 1475 526 1624 503 1800"
        fill="none"
        stroke="url(#river-light)"
        strokeWidth="42"
        strokeLinecap="round"
      />

      <path
        d="M300 0 C300 105 300 205 300 300 C300 418 420 478 420 610 C420 730 180 775 180 900 C180 1024 410 1070 410 1200 C410 1322 190 1370 190 1500 C190 1620 300 1696 300 1800"
        fill="none"
        stroke="hsl(var(--life-road-glow))"
        strokeWidth="104"
        strokeLinecap="round"
        filter="url(#road-glow)"
        opacity="0.55"
      />
      <path
        d="M300 0 C300 105 300 205 300 300 C300 418 420 478 420 610 C420 730 180 775 180 900 C180 1024 410 1070 410 1200 C410 1322 190 1370 190 1500 C190 1620 300 1696 300 1800"
        fill="none"
        stroke="hsl(var(--life-road-border))"
        strokeWidth="82"
        strokeLinecap="round"
      />
      <path
        d="M300 0 C300 105 300 205 300 300 C300 418 420 478 420 610 C420 730 180 775 180 900 C180 1024 410 1070 410 1200 C410 1322 190 1370 190 1500 C190 1620 300 1696 300 1800"
        fill="none"
        stroke="url(#road-light)"
        strokeWidth="64"
        strokeLinecap="round"
      />
      <path
        d="M300 0 C300 105 300 205 300 300 C300 418 420 478 420 610 C420 730 180 775 180 900 C180 1024 410 1070 410 1200 C410 1322 190 1370 190 1500 C190 1620 300 1696 300 1800"
        fill="none"
        stroke="hsl(var(--life-road-highlight))"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="8 16"
        opacity="0.58"
      />

      {[300, 610, 900, 1200, 1500].map((y, index) => {
        const x = [300, 420, 180, 410, 190][index];
        return (
          <g key={y}>
            <circle cx={x} cy={y} r="67" fill="hsl(var(--life-road-glow))" opacity="0.28" />
            <circle cx={x} cy={y} r="53" fill="hsl(var(--life-road-border))" />
            <circle cx={x} cy={y} r="43" fill="url(#road-light)" stroke="hsl(var(--life-road-highlight))" strokeWidth="3" opacity="0.92" />
          </g>
        );
      })}
    </svg>
  );
}

export default function LifeChallengeMap({
  score,
  progress,
  celebrated,
  loading,
  onChallenge,
  onCelebrate,
}: LifeChallengeMapProps) {
  const completion = useMemo(() => {
    const recorded = [progress.assessment, progress.connection, progress.goodDeed, progress.dataSource, progress.proposalVote];
    let sequenceOpen = true;

    return recorded.map((isRecorded) => {
      const isComplete = sequenceOpen && isRecorded;
      if (!isComplete) sequenceOpen = false;
      return isComplete;
    });
  }, [progress]);
  const next = completion.findIndex((done) => !done);
  const allComplete = next === -1;
  const celebrationStarted = useRef(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const houseRef = useRef<HTMLButtonElement>(null);
  const [infoChallenge, setInfoChallenge] = useState<number | null>(null);
  const [standingInfoOpen, setStandingInfoOpen] = useState(false);
  const beginButtonRef = useRef<HTMLButtonElement>(null);

  const closePopups = useCallback(() => {
    setInfoChallenge(null);
    setStandingInfoOpen(false);
  }, []);

  useEffect(() => {
    if (infoChallenge === null) return;
    beginButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopups();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePopups, infoChallenge]);

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
    <section ref={scrollAreaRef} onScroll={closePopups} className="relative h-full min-h-0 overflow-y-auto bg-card px-1" aria-label="Life challenge journey">
      <div className="sticky left-3 top-3 z-50 ml-2 h-0 w-fit translate-y-2">
        <div className="relative rounded-full border border-border/60 bg-background/55 p-1.5 shadow-lg backdrop-blur-md">
          <StandingOrb
            score={score}
            size={43}
            compact
            onTap={() => {
              setInfoChallenge(null);
              setStandingInfoOpen(true);
            }}
          />
          {standingInfoOpen && (
            <div
              role="dialog"
              aria-label="What Standing means"
              className="absolute left-[calc(100%+8px)] top-1/2 z-50 w-52 -translate-y-1/2 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-xl backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
            >
              <p className="text-sm font-bold leading-tight text-foreground">Set your standing first</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Standing is your current Trust Score tier, shown by this sphere. Your initial assessment establishes it.
              </p>
              <Button type="button" size="sm" variant="ghost" className="mt-2 h-8 px-2 text-xs text-muted-foreground" onClick={closePopups}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="relative mx-auto aspect-[1/3] w-full max-w-2xl overflow-hidden rounded-[15%] bg-card">
        <LifeTerrain />
        <Button
          ref={houseRef}
          type="button"
          variant="ghost"
          disabled={!allComplete || loading}
          aria-label={allComplete ? "Enter the completed wave one destination" : "Complete all five challenges to unlock the destination"}
          onClick={celebrateFromHouse}
          className={`absolute left-[38%] top-0 z-20 h-[9%] w-[24%] rounded-[45%] border-0 bg-transparent p-0 hover:bg-transparent ${
            allComplete ? "drop-shadow-[0_0_20px_hsl(var(--life-amber)/0.95)] hover:scale-105" : "cursor-default disabled:opacity-100"
          }`}
        />

        {MAP_NODES.map((node) => {
              const index = node.challenge - 1;
              const done = completion[index];
              const current = next === index;
              const enabled = done || current;
              const interactive = enabled && !loading;
              const label = done
                ? `Challenge ${node.challenge}, complete`
                : current
                  ? `Challenge ${node.challenge}, available`
                  : `Challenge ${node.challenge}, locked`;
              const fadedNumber = node.challenge === 1;
          return (
            <Button
              key={node.challenge}
              type="button"
              variant="ghost"
              disabled={loading}
              aria-disabled={!interactive}
              aria-label={label}
              tabIndex={interactive ? 0 : -1}
              onClick={() => {
                if (!interactive) return;
                if (!done) {
                  setInfoChallenge(node.challenge);
                  setStandingInfoOpen(node.challenge === 1);
                  return;
                }
                setStandingInfoOpen(false);
                onChallenge(node.challenge);
              }}
              className={`absolute z-20 aspect-square h-[5.67%] -translate-x-1/2 -translate-y-1/2 rounded-full border p-0 text-3xl font-black transition-[filter,transform,opacity] disabled:opacity-100 ${node.position} ${
                fadedNumber
                  ? "border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground/65 shadow-[inset_0_4px_10px_hsl(var(--primary-foreground)/0.32),inset_0_-8px_14px_hsl(var(--foreground)/0.22),0_5px_12px_hsl(var(--foreground)/0.35)] backdrop-blur-[2px]"
                  : "border-life-amber/70 bg-life-amber/75 text-life-ink shadow-[inset_0_5px_12px_hsl(var(--primary-foreground)/0.45),inset_0_-9px_14px_hsl(var(--life-amber)/0.5),0_0_18px_hsl(var(--life-amber)/0.95)]"
              } ${interactive ? "cursor-pointer hover:scale-105 active:scale-95 focus-visible:scale-105" : "cursor-default hover:bg-life-amber/75"} ${current ? "motion-safe:animate-pulse" : ""} ${!enabled ? "saturate-50" : ""}`}
            >
              <span className="drop-shadow-sm">{node.challenge}</span>
            </Button>
          );
        })}

        {infoChallenge !== null &&
          (() => {
            const node = MAP_NODES.find((item) => item.challenge === infoChallenge);
            if (!node) return null;
            const info = CHALLENGE_INFO[infoChallenge];
            // Bubble height is 5.67% of a map three times as tall as it is wide.
            const bubbleRadiusPercent = (5.67 * 3) / 2;
            const placeRight = node.x <= 50;
            const edgePercent = (placeRight ? node.x : 100 - node.x) + bubbleRadiusPercent;
            const availablePercent = 100 - edgePercent;
            return (
              <>
                <div aria-hidden="true" className="absolute inset-0 z-30" onClick={closePopups} />
                <div
                  role="dialog"
                  aria-label={`Challenge ${node.challenge}: ${info.title}`}
                  className="absolute z-40 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-xl backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
                  style={{
                    ...(placeRight
                      ? { left: `calc(${edgePercent}% + 8px)` }
                      : { right: `calc(${edgePercent}% + 8px)` }),
                    width: `min(240px, calc(${availablePercent}% - 16px))`,
                    top: `${node.y}%`,
                    transform: "translateY(-50%)",
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-life-amber">
                    Challenge {node.challenge}
                  </p>
                  <p className="mt-0.5 text-sm font-bold leading-tight text-foreground">{info.title}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{info.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      ref={beginButtonRef}
                      type="button"
                      size="sm"
                      className="h-8 flex-1 text-xs"
                      onClick={() => {
                        closePopups();
                        onChallenge(node.challenge);
                      }}
                    >
                      Begin
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={closePopups}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
      </div>
    </section>
  );
}
