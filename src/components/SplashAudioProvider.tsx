import { createContext, useCallback, useContext, useEffect, useRef, ReactNode } from "react";
import splashAudio from "@/assets/zebulon-timeless-432hz.mp3.asset.json";

interface SplashAudioContextValue {
  fadeOutAndStop: (durationMs?: number) => void;
}

const SplashAudioContext = createContext<SplashAudioContextValue>({
  fadeOutAndStop: () => {},
});

export const useSplashAudio = () => useContext(SplashAudioContext);

const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("splashdebug") === "1";

const audioLog = (...args: unknown[]) => {
  if (isDebug) {
    try {
      console.log("[Splash Audio]", ...args);
    } catch {}
  }
};

const audioError = (...args: unknown[]) => {
  if (isDebug) {
    try {
      console.error("[Splash Audio Error]", ...args);
    } catch {}
  }
};

export const SplashAudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const gestureCleanupRef = useRef<(() => void) | null>(null);

  const fadeOutAndStop = useCallback((durationMs = 800) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeIntervalRef.current !== null) return;

    audioLog(`Initiating fadeOutAndStop over ${durationMs}ms`);

    const steps = Math.max(1, Math.round(durationMs / 50));
    const startVolume = a.volume;
    let step = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      step += 1;
      const next = startVolume * (1 - step / steps);
      a.volume = next > 0 ? next : 0;

      if (step >= steps) {
        if (fadeIntervalRef.current !== null) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        try {
          a.pause();
          audioLog("Audio paused and fade interval cleared successfully.");
        } catch (err) {
          audioError("--- BEGIN ERROR HANDLING: Audio Pause ---");
          audioError("Failed to pause audio element at end of fade.");
          audioError("Error details:", err);
          audioError("--- END ERROR HANDLING: Audio Pause ---");
        }
      }
    }, 50);
  }, []);

  useEffect(() => {
    audioLog("Initializing SplashAudioProvider and constructing Audio element...");

    // Prepare the track immediately, but let the video establish playback first.
    // Starting two media elements together can make WebKit reject video autoplay.
    const a = new Audio(splashAudio.url);

    // Metadata-only until playback begins — lets the splash video win the
    // bandwidth race on mobile networks instead of buffering in parallel.
    a.preload = "metadata";
    a.addEventListener("playing", () => {
      a.preload = "auto";
      audioLog("Audio is now playing, preload upgraded to auto.");
    });
    a.volume = 1;

    (a as any).playsInline = true;
    a.setAttribute("playsinline", "true");
    audioRef.current = a;

    let active = true;
    let started = false;

    const attempt = () => {
      if (!active || started) {
        audioLog(`Audio session attempt skipped. Active: ${active}, Started: ${started}`);
        return;
      }

      audioLog("Starting audio session attempt...");

      try {
        const p = a.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            started = true;
            gestureCleanupRef.current?.();
            audioLog("Audio session attempt completed successfully.");
          }).catch((err: unknown) => {
            audioError("--- BEGIN ERROR HANDLING: Audio Playback Promise Rejection ---");
            const name = err instanceof DOMException ? err.name : String(err);
            audioError(`Playback rejected by browser. Reason/Name: ${name}`);
            audioError(`Raw error object:`, err);

            audioLog("Deploying manual gesture recovery listeners (touchstart, click)...");
            const resume = () => {
              audioLog("Gesture detected. Re-attempting audio playback...");
              attempt();
            };

            const cleanup = () => {
              window.removeEventListener("touchstart", resume, true);
              window.removeEventListener("click", resume, true);
              gestureCleanupRef.current = null;
              audioLog("Manual gesture recovery listeners removed.");
            };

            cleanup();
            window.addEventListener("touchstart", resume, true);
            window.addEventListener("click", resume, true);
            gestureCleanupRef.current = cleanup;

            audioError("--- END ERROR HANDLING: Audio Playback Promise Rejection ---");
          });
        } else {
          audioLog("Audio play() invoked but did not return a Promise (likely an older browser engine).");
        }
      } catch (err: unknown) {
        audioError("--- BEGIN ERROR HANDLING: Synchronous Audio Playback Error ---");
        audioError("A synchronous error occurred while invoking a.play().");
        audioError("Error details:", err);
        audioError("--- END ERROR HANDLING: Synchronous Audio Playback Error ---");
      }
    };

    const onVideoPlaying = () => {
      audioLog("splash:video-playing event received. Triggering audio start.");
      attempt();
    };

    window.addEventListener("splash:video-playing", onVideoPlaying);

    return () => {
      audioLog("Cleaning up SplashAudioProvider...");
      active = false;
      window.removeEventListener("splash:video-playing", onVideoPlaying);
      gestureCleanupRef.current?.();

      if (fadeIntervalRef.current !== null) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }

      try {
        a.pause();
      } catch (err) {
        audioError("--- BEGIN ERROR HANDLING: Unmount Audio Pause ---");
        audioError("Failed to pause audio during cleanup phase.");
        audioError("Error details:", err);
        audioError("--- END ERROR HANDLING: Unmount Audio Pause ---");
      }

      audioRef.current = null;
      audioLog("Cleanup complete.");
    };
  }, []);

  return <SplashAudioContext.Provider value={{ fadeOutAndStop }}>{children}</SplashAudioContext.Provider>;
};

export default SplashAudioProvider;
