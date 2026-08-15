/**
 * Session Sentinel — 30-minute auto-logout + biometric re-entry lock.
 *
 * 1. Away / idle > 30 min  → supabase.auth.signOut() and route to /auth.
 * 2. Away < 30 min         → lock the shell and fire an automatic Face ID /
 *                            Touch ID challenge via the WKWebView bridge.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVE_KEY = "idia_last_active_at";

const now = () => Date.now();

const readLastActive = (): number => {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : now();
  } catch {
    return now();
  }
};

const writeLastActive = (ts: number) => {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(ts));
  } catch {}
};

export const clearSentinelState = () => {
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {}
};

interface Options {
  /** Only arm the sentinel while a session exists. */
  enabled: boolean;
  /** Called after the session has been purged. */
  onLogout: () => void;
}

export function useSessionSentinel({ enabled, onLogout }: Options) {
  const [locked, setLocked] = useState(false);
  const loggingOutRef = useRef(false);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const forceLogout = useCallback(async (reason: string) => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    console.warn(`[SESSION_SENTINEL][LOGOUT][START] Reason: ${reason}`);
    clearSentinelState();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.error("[SESSION_SENTINEL][LOGOUT][ERROR]", e);
    }
    setLocked(false);
    console.log("[SESSION_SENTINEL][LOGOUT][END:OK] Session purged.");
    onLogoutRef.current?.();
    loggingOutRef.current = false;
  }, []);

  const unlock = useCallback(() => {
    console.log("[SESSION_SENTINEL][UNLOCK] Biometric challenge satisfied.");
    writeLastActive(now());
    setLocked(false);
  }, []);

  // ── Activity tracking + foreground-idle timer ──
  useEffect(() => {
    if (!enabled) return;
    writeLastActive(now());

    const touch = () => {
      if (!locked) writeLastActive(now());
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach((ev) => window.addEventListener(ev, touch, { passive: true }));

    const interval = window.setInterval(() => {
      if (locked) return;
      if (document.visibilityState !== "visible") return;
      const elapsed = now() - readLastActive();
      if (elapsed > IDLE_TIMEOUT_MS) {
        forceLogout(`Foreground idle for ${Math.round(elapsed / 60000)}m`);
      }
    }, 30_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, touch));
      window.clearInterval(interval);
    };
  }, [enabled, locked, forceLogout]);

  // ── Background / foreground transitions ──
  useEffect(() => {
    if (!enabled) return;

    const handleBackground = () => {
      writeLastActive(now());
      console.log("[SESSION_SENTINEL][BACKGROUND] Timestamp anchored.");
    };

    const handleForeground = () => {
      const elapsed = now() - readLastActive();
      console.log(`[SESSION_SENTINEL][FOREGROUND] Away for ${Math.round(elapsed / 1000)}s.`);
      if (elapsed > IDLE_TIMEOUT_MS) {
        forceLogout(`Away for ${Math.round(elapsed / 60000)}m`);
        return;
      }
      if (elapsed > 1500) {
        // Any real app switch re-arms the biometric challenge.
        setLocked(true);
      } else {
        writeLastActive(now());
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") handleBackground();
      else handleForeground();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", handleBackground);
    window.addEventListener("focus", handleForeground);
    window.addEventListener("pagehide", handleBackground);

    let capListener: any = null;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapacitorApp } = await import("@capacitor/app");
        capListener = await CapacitorApp.addListener("appStateChange", ({ isActive }: any) => {
          if (isActive) handleForeground();
          else handleBackground();
        });
      } catch {}
    })();

    // Cold-boot evaluation: a returning user whose stamp is stale gets purged.
    handleForeground();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", handleBackground);
      window.removeEventListener("focus", handleForeground);
      window.removeEventListener("pagehide", handleBackground);
      if (capListener?.remove) capListener.remove();
    };
  }, [enabled, forceLogout]);

  useEffect(() => {
    if (!enabled && locked) setLocked(false);
  }, [enabled, locked]);

  return { locked, unlock, forceLogout };
}
