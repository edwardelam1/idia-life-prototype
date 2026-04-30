import { useEffect, useRef, useState } from "react";

interface StandingOrbProps {
  score: number | null | undefined;
  size?: number;
}

type TierName =
  | "sovereign-null"
  | "white"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "red"
  | "orange"
  | "brown"
  | "vantablack";

interface TierStyle {
  name: TierName;
  center: string;
  edge: string;
  glow: string;
  isShimmer?: boolean;
  isVanta?: boolean;
}

// Chromatic mapping per IDIA Protocol
function resolveTier(score: number | null | undefined): TierStyle {
  if (score === null || score === undefined || Number.isNaN(score as any) || score === 0) {
    return {
      name: "sovereign-null",
      center: "hsla(0, 0%, 100%, 0.15)",
      edge: "hsla(220, 30%, 60%, 0.05)",
      glow: "hsla(200, 80%, 70%, 0.25)",
      isShimmer: true,
    };
  }
  if (score <= 110) {
    return { name: "white", center: "hsl(0, 0%, 100%)", edge: "hsl(0, 0%, 88%)", glow: "hsla(0, 0%, 100%, 0.6)" };
  }
  if (score <= 220) {
    return { name: "yellow", center: "hsl(55, 100%, 78%)", edge: "hsl(48, 95%, 50%)", glow: "hsla(50, 100%, 60%, 0.55)" };
  }
  if (score <= 330) {
    return { name: "green", center: "hsl(140, 70%, 70%)", edge: "hsl(145, 75%, 35%)", glow: "hsla(140, 80%, 50%, 0.5)" };
  }
  if (score <= 440) {
    return { name: "blue", center: "hsl(210, 90%, 75%)", edge: "hsl(220, 85%, 45%)", glow: "hsla(215, 90%, 55%, 0.5)" };
  }
  if (score <= 550) {
    return { name: "purple", center: "hsl(280, 70%, 78%)", edge: "hsl(275, 70%, 40%)", glow: "hsla(278, 80%, 55%, 0.5)" };
  }
  if (score <= 660) {
    return { name: "red", center: "hsl(5, 90%, 72%)", edge: "hsl(0, 80%, 42%)", glow: "hsla(2, 85%, 55%, 0.55)" };
  }
  if (score <= 770) {
    return { name: "orange", center: "hsl(30, 100%, 70%)", edge: "hsl(20, 95%, 48%)", glow: "hsla(25, 100%, 55%, 0.55)" };
  }
  if (score <= 880) {
    return { name: "brown", center: "hsl(28, 50%, 45%)", edge: "hsl(22, 60%, 22%)", glow: "hsla(25, 55%, 30%, 0.5)" };
  }
  return {
    name: "vantablack",
    center: "hsl(0, 0%, 4%)",
    edge: "hsl(0, 0%, 0%)",
    glow: "hsla(0, 0%, 0%, 0.85)",
    isVanta: true,
  };
}

const TIER_LABEL: Record<TierName, string> = {
  "sovereign-null": "Sovereign Null",
  white: "Initiate",
  yellow: "Awakening",
  green: "Growing",
  blue: "Trusted",
  purple: "Sovereign",
  red: "Distinguished",
  orange: "Luminary",
  brown: "Elder",
  vantablack: "Architect",
};

// Idle baseline rotation (rad/s) — gentle tumble on X and Y only.
// Z rotation is intentionally disabled so the orb reads as a true sphere.
const BASELINE_X = 0.04;
const BASELINE_Y = 0.07;

export default function StandingOrb({ score, size = 240 }: StandingOrbProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Per-axis angle and angular velocity (radians, rad/s) — X and Y only.
  const angleRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: BASELINE_X, y: BASELINE_Y });
  const lastTsRef = useRef<number | null>(null);

  // Pointer drag state
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const samplesRef = useRef<{ t: number; x: number; y: number }[]>([]);
  const stabilizedRef = useRef(true);

  const [isPressed, setIsPressed] = useState(false);

  const tier = resolveTier(score);

  useEffect(() => {
    console.log(`[ORB_TIER_RESOLVED] tier=${tier.name} score=${score ?? "null"}`);
  }, [tier.name, score]);

  useEffect(() => {
    console.log("[ORB_PHYSICS_START]");

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;

      if (!draggingRef.current) {
        // Decay flick momentum back toward each axis baseline
        (["x", "y"] as const).forEach((axis) => {
          const baseline = axis === "x" ? BASELINE_X : BASELINE_Y;
          const v = velRef.current[axis];
          if (Math.abs(v) > baseline + 0.001) {
            velRef.current[axis] = v * 0.97;
            if (
              Math.abs(velRef.current[axis]) <= baseline + 0.005 &&
              !stabilizedRef.current
            ) {
              stabilizedRef.current = true;
              console.log("[ORB_MOMENTUM_STABILIZED]");
            }
          } else {
            velRef.current[axis] = baseline * Math.sign(v || 1);
          }
          angleRef.current[axis] += velRef.current[axis] * dt;
        });

        applyTransform();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      console.log("[ORB_PHYSICS_END]");
    };
  }, []);

  const applyTransform = () => {
    const el = orbRef.current;
    if (!el) return;
    const { x, y } = angleRef.current;
    const rx = (x * 180) / Math.PI;
    const ry = (y * 180) / Math.PI;
    el.style.setProperty("--orb-rx", `${rx}deg`);
    el.style.setProperty("--orb-ry", `${ry}deg`);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    setIsPressed(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    samplesRef.current = [
      { t: performance.now(), x: angleRef.current.x, y: angleRef.current.y },
    ];
    console.log("[ORB_FLICK_BEGIN]");
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !lastPointerRef.current) return;
    const last = lastPointerRef.current;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;

    // Free 3D drag — horizontal → Y rotation, vertical → X rotation only.
    const scale = (Math.PI / Math.max(size, 1)) * 1.4;
    angleRef.current.y += dx * scale;
    angleRef.current.x -= dy * scale;

    lastPointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    samplesRef.current.push({
      t: performance.now(),
      x: angleRef.current.x,
      y: angleRef.current.y,
    });
    if (samplesRef.current.length > 6) samplesRef.current.shift();

    applyTransform();
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsPressed(false);

    const samples = samplesRef.current;
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) {
        const clamp = (v: number) => Math.max(-12, Math.min(12, v));
        velRef.current.x = clamp((last.x - first.x) / dt);
        velRef.current.y = clamp((last.y - first.y) / dt);
      }
    }
    stabilizedRef.current = false;
    console.log(
      `[ORB_FLICK_RELEASE] vx=${velRef.current.x.toFixed(2)} vy=${velRef.current.y.toFixed(2)}`,
    );
  };

  // Build the orb visual styles
  const orbBackground = tier.isShimmer
    ? `radial-gradient(circle at 35% 30%, ${tier.center}, hsla(280, 80%, 70%, 0.08) 55%, hsla(180, 80%, 70%, 0.05) 100%)`
    : tier.isVanta
    ? `radial-gradient(circle at 40% 35%, hsl(0,0%,12%) 0%, ${tier.center} 35%, ${tier.edge} 100%)`
    : `radial-gradient(circle at 35% 28%, ${tier.center} 0%, ${tier.center} 25%, ${tier.edge} 95%)`;

  return (
    <div
      className="flex flex-col items-center justify-center select-none"
      style={{ touchAction: "none" }}
    >
      {/* Scene gives the orb real perspective so X/Y rotations look 3D */}
      <div
        ref={sceneRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          perspective: `${size * 4}px`,
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          ref={orbRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative cursor-grab active:cursor-grabbing"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            background: orbBackground,
            boxShadow: `0 20px 60px -10px ${tier.glow}, inset -20px -30px 60px hsla(0,0%,0%,0.25), inset 15px 20px 40px hsla(0,0%,100%,0.25)`,
            transformStyle: "preserve-3d",
            transform:
              "rotateX(var(--orb-rx, 0deg)) rotateY(var(--orb-ry, 0deg)) rotateZ(var(--orb-rz, 0deg))" +
              ` scale(${isPressed ? "1.04" : "1"})`,
            transition: "box-shadow 400ms ease, transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            willChange: "transform",
            backdropFilter: tier.isShimmer ? "blur(6px)" : undefined,
          }}
        >
          {/* Specular highlight — pinned to the front face of the sphere */}
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              top: "12%",
              left: "18%",
              width: "40%",
              height: "30%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, hsla(0,0%,100%,0.55), hsla(0,0%,100%,0) 70%)",
              filter: "blur(2px)",
              transform: "translateZ(1px)",
            }}
          />
          {/* Sovereign-null shimmer overlay */}
          {tier.isShimmer && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: "50%",
                background:
                  "conic-gradient(from 0deg, hsla(280,80%,70%,0.25), hsla(180,80%,70%,0.25), hsla(50,90%,70%,0.25), hsla(320,80%,70%,0.25), hsla(280,80%,70%,0.25))",
                mixBlendMode: "screen",
                animation: "orb-shimmer 8s linear infinite",
                opacity: 0.6,
              }}
            />
          )}
        </div>
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Your Standing</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{TIER_LABEL[tier.name]}</p>

      <style>{`
        @keyframes orb-shimmer {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
