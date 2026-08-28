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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedAtRef = useRef<number>(Date.now());
  const recoveryAttemptsRef = useRef(0);

  // Attempt imperative play on mount — older iOS (iPhone 11-era WebKit)
  // often defers autoplay until an explicit .play() call, even when muted.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute("muted", "");
    v.setAttribute("webkit-playsinline", "true");
    v.setAttribute("playsinline", "true");

    let sawData = false;
    let active = true;
    let playInFlight = false;
    let retryTimer: number | null = null;

    const tryPlay = () => {
      if (!active || v.ended || playInFlight || !v.paused) return;
      playInFlight = true;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.then(() => {
          if (active) setAutoplayBlocked(false);
        })
          .catch((err: unknown) => {
            // AbortError is produced when WebKit supersedes one play request
            // with another media operation; it is recoverable, not a failure.
            const name = err instanceof DOMException ? err.name : String(err);
            splashLog("play() rejected:", name);
            if (active && err instanceof DOMException && err.name === "NotAllowedError") {
              setAutoplayBlocked(true);
            }
          })
          .finally(() => {
            playInFlight = false;
          });
      } else {
        playInFlight = false;
      }
    };

    const schedulePlay = () => {
      if (!active || v.ended || retryTimer !== null) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        tryPlay();
      }, 120);
    };

    const onProgress = () => {
      sawData = true;
    };
    const onPlaying = () => {
      setAutoplayBlocked(false);
      setPlaybackStartedAt((prev) => prev ?? Date.now());
    };
    // iOS WKWebView may pause a media element when its audio session changes.
    // The splash asset is video-only now, but recover any external pause rather
    // than allowing a transient interruption to terminate the sequence.
    const onPause = () => {
      if (!v.ended) schedulePlay();
    };
    const onStalled = () => schedulePlay();
    // A single media error must not collapse the whole sequence: reload the
    // element and retry once before giving up on the video phase.
    const onError = () => {
      const code = v.error?.code;
      splashLog("error event · code:", code, "message:", v.error?.message, "readyState:", v.readyState);
      if (!active) return;
      if (recoveryAttemptsRef.current < 1) {
        recoveryAttemptsRef.current += 1;
        splashLog("attempting one reload recovery");
        try {
          v.load();
        } catch {}
        schedulePlay();
        return;
      }
      setAutoplayBlocked(true);
    };

    const trace = (name: string) => () =>
      splashLog(name, "· t=", v.currentTime.toFixed(2), "readyState=", v.readyState);
    const traced: Array<[string, EventListener]> = [
      ["loadedmetadata", trace("loadedmetadata")],
      ["canplay", trace("canplay")],
      ["waiting", trace("waiting")],
      ["suspend", trace("suspend")],
      ["ended", trace("ended")],
    ];
    traced.forEach(([n, fn]) => v.addEventListener(n, fn));

    v.addEventListener("loadedmetadata", onProgress);
    v.addEventListener("loadeddata", schedulePlay);
    v.addEventListener("canplay", schedulePlay);
    v.addEventListener("progress", onProgress);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("error", onError);
    tryPlay();

    const ticker = window.setInterval(() => {
      splashLog("tick · t=", v.currentTime.toFixed(2), "paused=", v.paused, "readyState=", v.readyState);
    }, 1000);

    // Long safety net: only bail when NO data at all has arrived.
    const guard = window.setTimeout(() => {
      if (!sawData && v.readyState < 1) {
        splashLog("no-data guard fired — falling back to logo-only sequence");
        setAutoplayBlocked(true);
      }
    }, 12000);

    return () => {
      active = false;
      window.clearTimeout(guard);
      window.clearInterval(ticker);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      traced.forEach(([n, fn]) => v.removeEventListener(n, fn));
      v.removeEventListener("loadedmetadata", onProgress);
      v.removeEventListener("loadeddata", schedulePlay);
      v.removeEventListener("canplay", schedulePlay);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("error", onError);
    };
  }, []);

  const handleSkip = useCallback(() => {
    // Ignore the very first taps — the audio-unlock gesture (and stray touches
    // while the video starts) were dismissing the splash immediately.
    if (Date.now() - mountedAtRef.current < 2000) return;
    onComplete();
  }, [onComplete]);

  // Hand off to the logo when the video ends naturally.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => {
      splashLog("video ended — handing off to logo");
      setPhase((p) => (p === "video" ? "logo" : p));
    };
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, []);

  // Video → logo hand-off. Driven by real playback progress, never by a
  // wall-clock timer that can cut the video off while it is still painting.
  useEffect(() => {
    if (autoplayBlocked) {
      setPhase((p) => (p === "video" ? "logo" : p));
      return;
    }
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
        splashLog("playback complete at t=", t.toFixed(2), "— logo");
        window.clearInterval(poll);
        setPhase((p) => (p === "video" ? "logo" : p));
        return;
      }

      // Hard stall: no forward progress for 6s despite recovery attempts.
      if (Date.now() - lastProgressAt > 6000) {
        splashLog("stalled with no progress for 6s at t=", t.toFixed(2), "— logo");
        window.clearInterval(poll);
        setPhase((p) => (p === "video" ? "logo" : p));
      }
    }, 250);

    return () => window.clearInterval(poll);
  }, [autoplayBlocked, playbackStartedAt]);

  // Logo tail: fade-in 1.2s · hold 1.5s · fade-out 1.5s · white 0.8s.
  // Started once when the logo phase begins; later phase changes must not
  // cancel the chain, so the timers live behind a one-shot guard.
  const tailStartedRef = useRef(false);
  useEffect(() => {
    if (phase !== "logo" || tailStartedRef.current) return;
    tailStartedRef.current = true;
    const t1 = setTimeout(() => setPhase("logoFadeOut"), 2700);
    const t2 = setTimeout(() => setPhase("white"), 4200);
    const t3 = setTimeout(() => onComplete(), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase, onComplete]);


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
          opacity: phase === "video" && !autoplayBlocked ? 1 : 0,
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
        className="absolute inset-0"
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

      {/* Rushing splash video */}
      <video
        ref={videoRef}
        src={splashVideo.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in"
        style={{
          opacity: phase === "video" && !autoplayBlocked ? 1 : 0,
        }}
      />

      {/* Logo emerging — cinematic fade-in, glowing hold, graceful release */}
      <div
        className="absolute inset-0 flex items-center justify-center"
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
