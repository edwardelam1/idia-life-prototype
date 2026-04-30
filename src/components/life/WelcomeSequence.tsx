import { useEffect, useMemo, useState, type RefObject } from "react";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import idiaLogo from "@/assets/IDIA_Logo_Official.png";

interface WelcomeSequenceProps {
  tabRefs: RefObject<Record<string, HTMLButtonElement | null>>;
  onComplete: () => void;
}

interface SpotlightTab {
  id: string;
  label: string;
  copy: string;
}

const SPOTLIGHT_TABS: SpotlightTab[] = [
  { id: "wallet", label: "Wallet", copy: "See, manage, and control your financial world with clarity and transparency." },
  { id: "data", label: "My Data", copy: "Connect your apps. Turn your everyday digital activity into something that earns for you." },
  { id: "life", label: "Life", copy: "Take assessments that reveal how you think, act, and operate—so we can deliver insights that actually matter." },
  { id: "shop", label: "Shop", copy: "Discover and support the places you love—from local favorites to unique finds." },
  { id: "vote", label: "Vote", copy: "Shape the future. Your voice directly influences the evolution of the ecosystem." },
  { id: "pro", label: "Pro", copy: "Level up. Whether you are building a career or mastering yourself, this is where performance meets opportunity." },
];

const WelcomeSequence = ({ tabRefs, onComplete }: WelcomeSequenceProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [tabIndex, setTabIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{ x: number; y: number; r: number } | null>(null);

  useEffect(() => {
    console.log("[WELCOME_SEQUENCE_START]");
    return () => console.log("[WELCOME_SEQUENCE_END]");
  }, []);

  useEffect(() => {
    console.log(`[WELCOME_STEP: ${step}]`);
  }, [step]);

  // Compute spotlight position from the live tab button rect
  useEffect(() => {
    if (step !== 3) return;

    const compute = () => {
      const tab = SPOTLIGHT_TABS[tabIndex];
      const el = tabRefs.current?.[tab.id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const r = Math.max(rect.width, rect.height) * 0.95 + 12;
      setSpotlightRect({ x, y, r });
      console.log(`[SPOTLIGHT_TAB_FOCUS: ${tab.label}]`);
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [step, tabIndex, tabRefs]);

  const finish = () => {
    try {
      localStorage.setItem("idia_welcome_seen_v1", "1");
    } catch {
      // no-op
    }
    onComplete();
  };

  const next = () => {
    if (step === 3) {
      if (tabIndex < SPOTLIGHT_TABS.length - 1) {
        setTabIndex(tabIndex + 1);
        return;
      }
      setStep(4);
      return;
    }
    if (step < 5) setStep((step + 1) as 1 | 2 | 3 | 4 | 5);
    else finish();
  };

  // Particles for Step 1
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        const dist = 220 + Math.random() * 180;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const delay = Math.random() * 600;
        const hue = i % 3 === 0 ? "#14b8a6" : i % 3 === 1 ? "#f97316" : "#fbbf24";
        return { dx, dy, delay, hue };
      }),
    []
  );

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden text-slate-800"
      style={{
        background: `
          radial-gradient(ellipse at 15% 10%, rgba(186,230,253,0.85) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 20%, rgba(254,243,199,0.85) 0%, transparent 55%),
          radial-gradient(ellipse at 50% 95%, rgba(224,242,254,0.9) 0%, transparent 60%),
          linear-gradient(180deg, #fbfdff 0%, #f3f7fb 50%, #fefaf2 100%)
        `,
      }}
    >
      {/* Persistent Skip */}
      <button
        onClick={() => {
          console.log("[WELCOME_SEQUENCE_SKIP]");
          finish();
        }}
        className="fixed top-0 right-0 z-[210] m-4 mt-[max(1rem,env(safe-area-inset-top))] px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase border border-slate-300/70 rounded-full bg-white/70 hover:bg-white text-slate-700 backdrop-blur-md transition-colors shadow-sm"
      >
        Skip
      </button>

      {/* STEP 1 — Materialization */}
      {step === 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
            {/* Silhouette */}
            <div
              className="absolute inset-0 rounded-full animate-welcome-glow"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(20,184,166,0.55) 0%, rgba(251,191,36,0.25) 40%, rgba(0,0,0,0) 70%)",
                filter: "blur(2px)",
              }}
            />
            <div
              className="absolute w-32 h-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(20,184,166,0.6) 50%, rgba(0,0,0,0) 100%)",
                boxShadow: "0 0 80px 20px rgba(20,184,166,0.45), 0 0 160px 40px rgba(251,191,36,0.2)",
              }}
            />
            {/* Particles */}
            {particles.map((p, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full animate-welcome-particle"
                style={{
                  background: p.hue,
                  boxShadow: `0 0 10px ${p.hue}`,
                  // @ts-ignore
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  animationDelay: `${p.delay}ms`,
                }}
              />
            ))}
          </div>

          <div className="max-w-md text-center space-y-3 text-sm leading-relaxed">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-300 via-amber-200 to-orange-300 bg-clip-text text-transparent">
              Welcome to Life.
            </h2>
            <p className="text-white/80">This isn’t just another app.</p>
            <p className="text-white/80">This is where you come into focus.</p>
            <p className="text-white/70">
              Life is your gateway to understanding, owning, and activating your digital self — your digital twin. Every
              interaction, every data point, every signal you create has value. Here, you don’t give that value away…
              you claim it.
            </p>
            <p className="text-white/80">Because your data isn’t just information.</p>
            <p className="font-semibold text-amber-200">It’s leverage. It’s currency. It’s power.</p>
            <p className="text-white/80">And Life is how you unlock it.</p>
          </div>

          <ContinueButton onClick={next} label="Continue" />
        </div>
      )}

      {/* STEP 2 — IDIA Protocol */}
      {step === 2 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="relative w-[320px] h-[260px] mb-6">
            <svg viewBox="0 0 320 260" className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="lineGrad" x1="0" x2="1">
                  <stop offset="0" stopColor="#14b8a6" />
                  <stop offset="1" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              {[
                [60, 40],
                [260, 40],
                [60, 220],
                [260, 220],
              ].map(([x, y], i) => (
                <line
                  key={i}
                  x1="160"
                  y1="130"
                  x2={x}
                  y2={y}
                  stroke="url(#lineGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="240"
                  strokeDashoffset="240"
                  className="animate-welcome-line"
                  style={{ animationDelay: `${i * 180}ms` }}
                  opacity="0.7"
                />
              ))}
            </svg>

            {/* Center IDIA logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white/5 backdrop-blur-xl border border-white/15 flex items-center justify-center"
              style={{ boxShadow: "0 0 60px rgba(99,102,241,0.45)" }}>
              <img src={idiaLogo} alt="IDIA" className="w-16 h-auto" />
            </div>

            {/* Pillars */}
            {[
              { label: "Life", x: "8px", y: "8px" },
              { label: "Pay", x: "calc(100% - 88px)", y: "8px" },
              { label: "Hub", x: "8px", y: "calc(100% - 44px)" },
              { label: "Synapse Engine", x: "calc(100% - 148px)", y: "calc(100% - 44px)" },
            ].map((p) => (
              <div
                key={p.label}
                className="absolute px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wide backdrop-blur-md"
                style={{ left: p.x, top: p.y, boxShadow: "0 0 20px rgba(20,184,166,0.35)" }}
              >
                {p.label}
              </div>
            ))}
          </div>

          <div className="max-w-md text-center space-y-2 text-sm leading-relaxed">
            <h2 className="text-2xl font-bold text-amber-200">Enter the IDIA Protocol</h2>
            <p className="text-white/80">
              Behind everything you see is something bigger: a new system designed to shift control back to individuals.
            </p>
            <p className="text-white/70">The IDIA Protocol connects:</p>
            <ul className="text-white/80 text-left mx-auto inline-block space-y-1">
              <li><span className="text-teal-300 font-semibold">Life</span> – your personal command center</li>
              <li><span className="text-teal-300 font-semibold">Pay</span> – where value moves</li>
              <li><span className="text-teal-300 font-semibold">Hub</span> – where intelligence is built</li>
              <li><span className="text-teal-300 font-semibold">Synapse Engine</span> – where it all comes alive</li>
            </ul>
            <p className="text-white/70 pt-1">
              Together, they create a new economic reality—one where your data works for you, not against you.
            </p>
            <p className="text-white/80">You’re not just a user here.</p>
            <p className="font-semibold text-amber-200">You’re an owner of your value.</p>
          </div>

          <ContinueButton onClick={next} label="Continue" />
        </div>
      )}

      {/* STEP 3 — Spotlight Tour */}
      {step === 3 && spotlightRect && (
        <>
          {/* Dimmer with cut-out spotlight using radial gradient mask */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500"
            style={{
              background: `radial-gradient(circle at ${spotlightRect.x}px ${spotlightRect.y}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${spotlightRect.r}px, rgba(0,0,0,0.85) ${spotlightRect.r + 24}px)`,
            }}
          />
          {/* Glowing ring */}
          <div
            className="absolute pointer-events-none rounded-full transition-all duration-500"
            style={{
              left: spotlightRect.x - spotlightRect.r,
              top: spotlightRect.y - spotlightRect.r,
              width: spotlightRect.r * 2,
              height: spotlightRect.r * 2,
              boxShadow:
                "0 0 0 2px rgba(20,184,166,0.7), 0 0 40px 6px rgba(20,184,166,0.5), 0 0 80px 16px rgba(251,191,36,0.25)",
            }}
          />

          {/* Caption */}
          <div className="absolute left-0 right-0 px-6"
            style={{ bottom: `calc(${spotlightRect.r}px + env(safe-area-inset-bottom) + 96px)` }}>
            <div className="max-w-md mx-auto rounded-2xl bg-white/5 backdrop-blur-xl border border-white/15 p-5 text-center"
              style={{ boxShadow: "0 0 40px rgba(20,184,166,0.25)" }}>
              <div className="text-xs uppercase tracking-[0.3em] text-amber-200 mb-2">
                {SPOTLIGHT_TABS[tabIndex].label}
              </div>
              <p className="text-sm text-white/85 leading-relaxed">{SPOTLIGHT_TABS[tabIndex].copy}</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {SPOTLIGHT_TABS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === tabIndex ? "w-6 bg-teal-300" : "w-1.5 bg-white/30"}`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-500/90 hover:bg-teal-400 text-black text-sm font-bold transition-colors"
              >
                {tabIndex < SPOTLIGHT_TABS.length - 1 ? "Next" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* STEP 4 — Sovereignty Shield */}
      {step === 4 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="relative mb-8 w-40 h-40 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full animate-welcome-pulse"
              style={{
                background:
                  "radial-gradient(circle, rgba(20,184,166,0.5) 0%, rgba(251,191,36,0.15) 50%, rgba(0,0,0,0) 75%)",
              }}
            />
            <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/20 backdrop-blur-xl flex items-center justify-center"
              style={{ boxShadow: "0 0 60px rgba(20,184,166,0.6)" }}>
              <ShieldCheck className="w-12 h-12 text-teal-300" />
            </div>
          </div>

          <div className="max-w-md text-center space-y-3 text-sm leading-relaxed">
            <h2 className="text-2xl font-bold text-amber-200">Built for Your Sovereignty</h2>
            <p className="text-white/80">We don’t trade your identity.</p>
            <p className="text-white/80">We don’t store who you are—we store what matters.</p>
            <p className="text-white/70">Your data is secured, anonymized, and fully under your control.</p>
            <p className="font-semibold text-teal-300">No names. No addresses. No compromise.</p>
            <p className="text-white/80">Because ownership means nothing without protection.</p>
          </div>

          <ContinueButton onClick={next} label="Continue" />
        </div>
      )}

      {/* STEP 5 — Final Launch */}
      {step === 5 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="max-w-md text-center space-y-3 text-sm leading-relaxed mb-10">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-300 via-amber-200 to-orange-300 bg-clip-text text-transparent">
              This Is Your Moment
            </h2>
            <p className="text-white/80">
              You’re stepping into a new system—one where your life, your data, and your value finally align.
            </p>
            <p className="font-semibold text-amber-200">Explore. Connect. Build. Earn.</p>
            <p className="text-white/80">Live on your terms.</p>
            <p className="text-white/70">Welcome to Life.</p>
          </div>

          <button
            onClick={finish}
            className="relative group inline-flex items-center gap-3 px-12 py-5 rounded-full font-extrabold text-lg tracking-[0.3em] text-black bg-gradient-to-r from-teal-300 via-amber-200 to-orange-300 transition-transform hover:scale-105 active:scale-95 animate-welcome-pulse"
            style={{
              boxShadow:
                "0 0 30px rgba(20,184,166,0.7), 0 0 80px rgba(251,191,36,0.5), 0 0 140px rgba(249,115,22,0.35)",
            }}
          >
            <Sparkles className="w-5 h-5" />
            START
          </button>
        </div>
      )}

      {/* Local keyframes */}
      <style>{`
        @keyframes welcome-particle {
          0% {
            transform: translate(var(--dx), var(--dy)) scale(0.4);
            opacity: 0;
          }
          25% { opacity: 1; }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.9;
          }
        }
        .animate-welcome-particle {
          animation: welcome-particle 1800ms ease-out forwards;
        }
        @keyframes welcome-glow {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        .animate-welcome-glow { animation: welcome-glow 3.2s ease-in-out infinite; }
        @keyframes welcome-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .animate-welcome-pulse { animation: welcome-pulse 2.4s ease-in-out infinite; }
        @keyframes welcome-line {
          to { stroke-dashoffset: 0; }
        }
        .animate-welcome-line { animation: welcome-line 1200ms ease-out forwards; }
      `}</style>
    </div>
  );
};

const ContinueButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="mt-8 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md text-sm font-semibold tracking-wide transition-colors"
  >
    {label}
    <ArrowRight className="w-4 h-4" />
  </button>
);

export default WelcomeSequence;
