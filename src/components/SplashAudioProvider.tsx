import { createContext, useCallback, useContext, useEffect, useRef, ReactNode } from "react";
import splashAudio from "@/assets/zebulon-timeless-432hz.mp3.asset.json";

interface SplashAudioContextValue {
  fadeOutAndStop: (durationMs?: number) => void;
}

const SplashAudioContext = createContext<SplashAudioContextValue>({
  fadeOutAndStop: () => {},
});

export const useSplashAudio = () => useContext(SplashAudioContext);

export const SplashAudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const gestureCleanupRef = useRef<(() => void) | null>(null);

  const fadeOutAndStop = useCallback((durationMs = 800) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeIntervalRef.current !== null) return;
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
        a.pause();
      }
    }, 50);
  }, []);

  useEffect(() => {
    // Prepare the track immediately, but let the video establish playback first.
    // Starting two media elements together can make WebKit reject video autoplay.
    const a = new Audio(splashAudio.url);
    // Metadata-only until playback begins — lets the splash video win the
    // bandwidth race on mobile networks instead of buffering in parallel.
    a.preload = "metadata";
    a.addEventListener("playing", () => {
      a.preload = "auto";
    });
    a.volume = 1;

    (a as any).playsInline = true;
    a.setAttribute("playsinline", "true");
    audioRef.current = a;

    let active = true;
    let started = false;

    const attempt = () => {
      if (!active || started) return;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          started = true;
          gestureCleanupRef.current?.();
        }).catch(() => {
          const resume = () => attempt();
          const cleanup = () => {
            window.removeEventListener("touchstart", resume, true);
            window.removeEventListener("click", resume, true);
            gestureCleanupRef.current = null;
          };
          cleanup();
          window.addEventListener("touchstart", resume, true);
          window.addEventListener("click", resume, true);
          gestureCleanupRef.current = cleanup;
        });
      }
    };

    const onVideoPlaying = () => attempt();
    window.addEventListener("splash:video-playing", onVideoPlaying);

    return () => {
      active = false;
      window.removeEventListener("splash:video-playing", onVideoPlaying);
      gestureCleanupRef.current?.();
      if (fadeIntervalRef.current !== null) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      a.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <SplashAudioContext.Provider value={{ fadeOutAndStop }}>{children}</SplashAudioContext.Provider>
  );
};

export default SplashAudioProvider;
