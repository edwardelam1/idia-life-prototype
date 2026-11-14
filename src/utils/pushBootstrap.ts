/**
 * Push notification bootstrap.
 *
 * Mounted once from App.tsx. Attaches listeners for tokens delivered by
 * either the iOS raw-WKWebView shell (via `push:token-received` /
 * `push:permission-denied` window CustomEvents) or the Android Capacitor
 * shell (via `@capacitor/push-notifications` events). Persists any token
 * that arrives while a user is authenticated so pushes work even if
 * Settings is never opened.
 *
 * Foreground push receipt on Android surfaces via `notify.info(...)`
 * which respects Focus Mode / quiet hours.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCachedUser } from "@/lib/authUser";
import { notify } from "@/lib/notify";
import { persistPushToken } from "@/utils/pushToken";

let started = false;

async function persistToken(token: string, platform: "ios" | "android") {
  try {
    if (!await persistPushToken(token, platform)) return;
    console.log(`[PUSH_BOOT][END:REGISTERED] ${platform}`);
  } catch {
    console.error("[PUSH_BOOT][END:FAILED] Device registration could not be saved");
  }
}

export function startPushBootstrap() {
  if (started || typeof window === "undefined") return;
  started = true;

  // ── iOS: raw WKWebView shell events ──
  window.addEventListener("push:token-received", (e: Event) => {
    const token = (e as CustomEvent).detail?.token as string | undefined;
    if (typeof token === "string" && token) {
      window.__idiaPendingPushToken = token;
      void persistToken(token, "ios");
    }
  });
  window.addEventListener("push:permission-denied", (e: Event) => {
    console.warn("[PUSH_BOOT][END:DENIED] iOS notification permission unavailable");
  });

  // Swift may set this if the token arrived before JS attached its listener.
  const pending = window.__idiaPendingPushToken;
  if (pending) {
    void persistToken(pending, "ios");
  }

  let requesting = false;
  const requestIOSRegistration = async () => {
    if (requesting) return;
    requesting = true;
    try {
      const { data: { user } } = await getCachedUser();
      if (!user) return;
      const { data: preference, error } = await supabase.from("user_preferences")
        .select("push_notifications").eq("user_id", user.id).maybeSingle();
      if (error || preference?.push_notifications === false) return;
      if (window.__idiaPendingPushToken) await persistToken(window.__idiaPendingPushToken, "ios");
      window.webkit?.messageHandlers?.nativePush?.postMessage({});
    } catch {
      console.warn("[PUSH_BOOT][END:FAILED] iOS registration request unavailable");
    } finally { requesting = false; }
  };
  void requestIOSRegistration();
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) return;
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      setTimeout(() => void requestIOSRegistration(), 0);
    }
  });
  window.addEventListener("app:foreground", () => void requestIOSRegistration());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void requestIOSRegistration();
  });
  window.addEventListener("push:notification-tapped", () => {
    // The global consent host, not notification data, decides whether entry is permitted.
    window.dispatchEvent(new CustomEvent("app:foreground"));
  });

  // ── Android: Capacitor plugin ──
  (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      await PushNotifications.addListener("registration", (t) => {
        void persistToken(t.value, "android");
      });
      await PushNotifications.addListener("registrationError", (err) => {
        console.error("🔔 [PUSH_BOOT] Android registration error:", err);
      });
      await PushNotifications.addListener("pushNotificationReceived", (n) => {
        notify.info(n.title || "Notification", { description: n.body || undefined });
      });
    } catch (err) {
      console.warn("🔔 [PUSH_BOOT] Android bootstrap unavailable:", err);
    }
  })();
}
