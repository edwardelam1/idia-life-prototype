import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

// Push registration for the IDIA iOS raw-WKWebView shell.
//
// The shell bypasses the Capacitor runtime, so `@capacitor/push-notifications`
// never resolves. Instead we bridge directly to Swift via the custom
// `nativePush` WebKit message handler. Swift registers with APNs at app
// launch (per Apple's lifecycle requirements) and dispatches
// `push:token-received` / `push:permission-denied` window CustomEvents once
// the user responds to the permission prompt.
//
// Desktop browsers fall back to the standard Notification API with a
// synthetic token so the UI toggle reflects real OS state.
export function usePushNotifications() {
  const enable = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 1. IDIA iOS native shell
    const nativeHandler = window.webkit?.messageHandlers?.nativePush;
    if (nativeHandler) {
      console.log("🔔 [PUSH_LOG] Native shell detected. Requesting APNs permissions...");

      return new Promise<boolean>((resolve) => {
        let settled = false;

        const cleanup = () => {
          window.removeEventListener("push:token-received", handleSuccess as EventListener);
          window.removeEventListener("push:permission-denied", handleError as EventListener);
        };

        const handleSuccess = async (e: Event) => {
          if (settled) return;
          settled = true;
          cleanup();
          const token = (e as CustomEvent).detail?.token as string | undefined;
          console.log("🔔 [PUSH_LOG] APNs Token received:", token);

          if (!token) {
            notify.warning("Push registration failed", { description: "No device token returned." });
            resolve(false);
            return;
          }

          try {
            await (supabase.from("push_tokens" as any) as any).upsert(
              { user_id: user.id, token, platform: "ios" },
              { onConflict: "user_id,token" }
            );
            resolve(true);
          } catch (err) {
            console.error("🔔 [PUSH_LOG] Failed to persist token:", err);
            resolve(false);
          }
        };

        const handleError = (e: Event) => {
          if (settled) return;
          settled = true;
          cleanup();
          const errorMsg = (e as CustomEvent).detail?.error || "Please enable in iOS Settings.";
          console.warn("🔔 [PUSH_LOG] Permission denied:", errorMsg);
          notify.warning("Push permission denied", { description: errorMsg });
          resolve(false);
        };

        window.addEventListener("push:token-received", handleSuccess as EventListener);
        window.addEventListener("push:permission-denied", handleError as EventListener);

        try {
          nativeHandler.postMessage({});
        } catch (err) {
          console.error("🔔 [PUSH_LOG] Failed to invoke native bridge:", err);
          if (!settled) {
            settled = true;
            cleanup();
            resolve(false);
          }
          return;
        }

        // 15s safety timeout in case the user ignores the OS prompt
        setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          console.warn("🔔 [PUSH_LOG] Timed out waiting for APNs response.");
          resolve(false);
        }, 15000);
      });
    }

    // 2. Desktop browser fallback
    let token: string | null = null;
    try {
      if (typeof Notification !== "undefined") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          notify.warning("Push permission denied");
          return false;
        }
        token = `web-${user.id}-${Date.now()}`;
      }
    } catch (err) {
      console.error("[push] registration failed", err);
    }

    if (!token) return false;

    await (supabase.from("push_tokens" as any) as any).upsert(
      { user_id: user.id, token, platform: "web" },
      { onConflict: "user_id,token" }
    );
    return true;
  }, []);

  const disable = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from("push_tokens" as any) as any).delete().eq("user_id", user.id);
  }, []);

  return { enable, disable };
}
