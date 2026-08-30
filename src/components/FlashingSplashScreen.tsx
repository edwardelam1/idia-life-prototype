import { useState, useEffect, useRef, useCallback } from "react";
import polishedLogo from "@/assets/IDIA_Life_Logo_Polished.png";
import splashVideo from "@/assets/splash-rush-web.mp4.asset.json";

interface FlashingSplashScreenProps {
  onComplete: () => void;
}

const splashLog = (...args: unknown[]) => {
  try {
    console.log("[SPLASH]", ...args);
  } catch {}
};

const FlashingSplashScreen = ({ onComplete }: FlashingSplashScreenProps) => {
  const [phase, setPhase] = useState<"video" | "logo" | "logoFadeOut" | "white">("video");
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(null);
  const [awaitingGesture, setAwaitingGesture] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const mountedAtRef = useRef<number>(Date.now());
  const debugEnabledRef = useRef(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("splashdebug") === "1",
  );
  const [debugEvents, setDebugEvents] = useState<string[]>([]);

  const record = useCallback((message: string) => {
    splashLog(message);
    if (debugEnabledRef.current) {
      setDebugEvents((events) => [...events.slice(-7), message]);
    }
  }, []);

  // 1 & 2: Build video imperatively, single owner for playback, retry loop
  useEffect(() => {
    if (!videoContainerRef.current || videoRef.current) return;

    record("Building imperative video element...");

    const video = document.createElement("video");
    videoRef.current = video;

    // 1. Set attributes BEFORE src assignment to guarantee inline/autoplay eligibility
    video.setAttribute("muted", "true");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.setAttribute("preload", "auto");
    video.setAttribute("disablepictureinpicture", "true");
    video.setAttribute("disableremoteplayback", "true");

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    video.className = "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in";
    video.style.opacity = "1";

    let active = true;
    let playInFlight = false;

    // 2 & 3: Single owner start routine with backoff retry
    const attemptPlay = () => {
      if (!active || video.ended || playInFlight || (!video.paused && video.currentTime > 0)) return;

      playInFlight = true;
      record(`attemptPlay (retry ${retryCountRef.current})`);

      // Re-assert muted state on every attempt
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;

      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.then(() => {
          if (!active) return;
          retryCountRef.current = 0;
          setAwaitingGesture(false);
          record("autoplay accepted");
        })
          .catch((err: unknown) => {
            if (!active) return;
            const name = err instanceof DOMException ? err.name : String(err);
            record(`play rejected: ${name}`);

            if (name === "NotAllowedError") {
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                setTimeout(() => {
                  if (active) attemptPlay();
                }, 500 * retryCountRef.current);
              } else {
                record("Max retries exhausted. Awaiting gesture.");
                setAwaitingGesture(true);
              }
            } else if (name !== "AbortError") {
              record(`unrecoverable error: ${name}`);
            }
          })
          .finally(() => {
            playInFlight = false;
          });
      } else {
        playInFlight = false;
      }
    };

    const onPlaying = () => {
      if (!active) return;
      setPlaybackStartedAt((prev) => prev ?? Date.now());
      record(`playing · t=${video.currentTime.toFixed(2)} rs=${video.readyState}`);
      // 4. Dispatch event to start audio strictly after video begins playing
      window.dispatchEvent(new CustomEvent("splash:video-playing"));
    };

    const onPause = () => {
      if (!active) return;
      record(`pause · t=${video.currentTime.toFixed(2)} rs=${video.readyState}`);
      if (!video.ended && !awaitingGesture) {
        setTimeout(attemptPlay, 100);
      }
    };

    const onEnded = () => {
      if (!active) return;
      record("video ended — handing off to logo");
      setPhase((p) => (p === "video" ? "logo" : p));
    };

    const onError = () => {
      if (!active) return;
      record(`error event · code: ${video.error?.code}`);
      try {
        video.load();
      } catch {}
      setTimeout(attemptPlay, 250);
    };

    const onReady = () => attemptPlay();

    const trace = (name: string) => () => {
      if (active) record(`${name} · t=${video.currentTime.toFixed(2)} rs=${video.readyState}`);
    };
    const traced: Array<[string, EventListener]> = [
      ["loadedmetadata", trace("loadedmetadata")],
      ["canplay", trace("canplay")],
      ["waiting", trace("waiting")],
      ["suspend", trace("suspend")],
    ];
    traced.forEach(([n, fn]) => video.addEventListener(n, fn));

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("stalled", onReady);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    // Assign src AFTER attributes
    record(`assigning src: ${splashVideo.url}`);
    video.src = splashVideo.url;
    videoContainerRef.current.appendChild(video);

    attemptPlay();

    const ticker = window.setInterval(() => {
      if (active) {
        record(`tick · t=${video.currentTime.toFixed(2)} p=${video.paused} rs=${video.readyState}`);
      }
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(ticker);
      traced.forEach(([n, fn]) => video.removeEventListener(n, fn));
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("stalled", onReady);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);

      if (videoContainerRef.current && video.parentNode === videoContainerRef.current) {
        videoContainerRef.current.removeChild(video);
      }
      video.src = "";
      videoRef.current = null;
    };
  }, [record]);

  // Sync video opacity with phase
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.opacity = phase === "video" ? "1" : "0";
    }
  }, [phase]);

  const handleSkip = useCallback(() => {
    // Ignore the very first taps — the audio-unlock gesture (and stray touches
    // while the video starts) were dismissing the splash immediately.
    if (Date.now() - mountedAtRef.current < 2000) return;
    onComplete();
  }, [onComplete]);

  // Video → logo hand-off fallback (watchdog)
  useEffect(() => {
    if (playbackStartedAt === null) return;

    const v = videoRef.current;
    if (!v) return;

    let lastTime = -1;
    let lastProgressAt = Date.now();

    const poll = window.setInterval(() => {
      const t = v.currentTime;
      const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 8;

      if (t > lastTime + 0.05) {
        lastTime = t;
        lastProgressAt = Date.now();
      }

      if (v.ended || t >= duration - 0.15) {
        record(`playback complete at t=${t.toFixed(2)} — logo`);
        window.clearInterval(poll);
        setPhase((p) => (p === "video" ? "logo" : p));
        return;
      }

      // Hard stall: no forward progress for 6s despite recovery attempts.
      if (Date.now() - lastProgressAt > 6000) {
        record(`stalled with no progress for 6s at t=${t.toFixed(2)} — logo`);
        window.clearInterval(poll);
        setPhase((p) => (p === "video" ? "logo" : p));
      }
    }, 250);

    return () => window.clearInterval(poll);
  }, [playbackStartedAt, record]);

  // Logo tail: fade-in 1.2s · hold 1.5s · fade-out 1.5s · white 0.8s.
  const tailStartedRef = useRef(false);
  const tailTimersRef = useRef<number[]>([]);
  useEffect(() => {
    if (phase !== "logo" || tailStartedRef.current) return;
    tailStartedRef.current = true;
    tailTimersRef.current = [
      window.setTimeout(() => setPhase("logoFadeOut"), 2700),
      window.setTimeout(() => setPhase("white"), 4200),
      window.setTimeout(() => onComplete(), 5000),
    ];
  }, [phase, onComplete]);

  useEffect(() => () => tailTimersRef.current.forEach((id) => window.clearTimeout(id)), []);

  // 5. Visible last-resort affordance
  const handleManualPlay = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    record("manual playback triggered");
    setAwaitingGesture(false);

    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current
        .play()
        .then(() => record("manual playback accepted"))
        .catch((err) => record(`manual playback failed: ${err}`));
    }
  };

  const logoVisible = phase === "logo";
  const logoReleasing = phase === "logoFadeOut" || phase === "white";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden touch-none cursor-pointer bg-white"
      onClick={handleSkip}
      onTouchStart={handleSkip}
      role="button"
      aria-label="Skip splash"
    >
      {/* Music credit — music-video style, only during the video */}
      <div
        className="absolute left-6 z-20 pointer-events-none transition-opacity duration-700"
        style={{
          bottom: "max(1.5rem, env(safe-area-inset-bottom))",
          opacity: phase === "video" ? 1 : 0,
        }}
      >
        <p
          className="text-white/85 text-sm font-medium tracking-wide leading-snug"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
        >
          Timeless by Zebulon
        </p>
        <p
          className="text-white/60 text-xs tracking-[0.18em] uppercase"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
        >
          RM Records
        </p>
      </div>

      {/* Milky fluid background (fallback while video buffers) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(255,250,245,1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(245,240,255,1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(250,248,240,1) 0%, transparent 50%),
            linear-gradient(135deg, #faf8f5 0%, #f0ebe6 25%, #e8e4e0 50%, #f5f0ec 75%, #faf8f5 100%)
          `,
          animation: "milkyShift 8s ease-in-out infinite",
        }}
      />

      {/* Imperative Video Container */}
      <div ref={videoContainerRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* 5. Visible last-resort affordance */}
      {awaitingGesture && phase === "video" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 z-50 cursor-pointer"
          onClick={handleManualPlay}
          onTouchStart={handleManualPlay}
        >
          <div className="text-white p-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all">
            <svg className="w-12 h-12 ml-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {debugEnabledRef.current && (
        <pre className="absolute inset-x-3 top-3 z-40 max-h-48 overflow-hidden bg-black/80 p-3 text-[10px] leading-4 text-white pointer-events-none">
          {debugEvents.length > 0 ? debugEvents.join("\n") : "splash diagnostics waiting…"}
        </pre>
      )}

      {/* Logo emerging — cinematic fade-in, glowing hold, graceful release */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: logoVisible ? 1 : logoReleasing ? 0 : 0,
          transform: logoVisible ? "scale(1)" : logoReleasing ? "scale(1.04)" : "scale(0.92)",
          filter: logoVisible ? "blur(0px)" : "blur(4px)",
          transition: logoReleasing
            ? "opacity 1500ms ease-in-out, transform 1500ms ease-in-out, filter 1500ms ease-in-out"
            : "opacity 1200ms ease-out, transform 1200ms ease-out, filter 1200ms ease-out",
        }}
      >
        <img
          src={polishedLogo}
          alt="Life by IDIA"
          className="w-24 h-24 rounded-3xl shadow-2xl"
          style={{
            animation: logoVisible ? "logoGlow 2.4s ease-in-out infinite" : "none",
          }}
        />
      </div>

      {/* White fade-out overlay */}
      <div
        className="absolute inset-0 bg-white transition-opacity duration-[800ms] ease-in-out pointer-events-none"
        style={{
          opacity: phase === "white" ? 1 : 0,
        }}
      />

      <style>{`
        @keyframes milkyShift {
          0%, 100% { background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%; }
          50% { background-position: 60% 40%, 30% 80%, 80% 20%, 100% 0%; }
        }
        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.4)) drop-shadow(0 0 24px rgba(200,220,255,0.25)); }
          50%      { filter: drop-shadow(0 0 22px rgba(255,255,255,0.7)) drop-shadow(0 0 44px rgba(200,220,255,0.5)); }
        }
      `}</style>
    </div>
  );
};

export default FlashingSplashScreen;
