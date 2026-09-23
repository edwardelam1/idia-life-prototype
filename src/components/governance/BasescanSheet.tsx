import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Opens an external URL with the exact same bridge behavior as the wallet's Hub link:
 *  - Custom iOS shell: hands off to `webkit.messageHandlers.openExternalHub` (with the
 *    active session, same as the Hub hand-over) so the native Safari-style sheet opens.
 *  - Capacitor native: in-app browser popover.
 *  - Standard web: a new browser window/tab.
 */
export const openExternalLink = async (url: string): Promise<void> => {
  console.log(`🔗 [EXTERNAL_LINK_LOG][BEGIN: React.ExternalLink.Initiate] Target: ${url}`);

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "🚨 [EXTERNAL_LINK_LOG][FATAL: React.ExternalLink.SessionError] Supabase returned an error:",
        error.message,
      );
    }

    if (
      (window as any).webkit &&
      (window as any).webkit.messageHandlers &&
      (window as any).webkit.messageHandlers.openExternalHub
    ) {
      console.log(
        "🔗 [EXTERNAL_LINK_LOG][PROCESS: React.ExternalLink.Handover] Native shell message handler found. Executing secure handover...",
      );
      (window as any).webkit.messageHandlers.openExternalHub.postMessage({
        url,
        accessToken: session?.access_token ?? null,
        refreshToken: session?.refresh_token ?? null,
        expiry: session?.expires_in ?? null,
      });
      console.log("[EXTERNAL_LINK_LOG][END: React.ExternalLink.Handover] Hand-off dispatched to native shell.");
      return;
    }

    if (Capacitor.isNativePlatform()) {
      console.log("🔗 [EXTERNAL_LINK_LOG][PROCESS: React.ExternalLink.Capacitor] Opening in-app browser popover.");
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url, presentationStyle: "popover" });
        return;
      } catch (capError) {
        console.error("[EXTERNAL_LINK_LOG][FATAL: React.ExternalLink.Capacitor] Native browser sheet failed.", capError);
        toast.error("The link could not be opened. Please try again.");
        return;
      }
    }

    console.log("🔗 [EXTERNAL_LINK_LOG][PROCESS: React.ExternalLink.Fallback] Standard web browser. Opening new window.");
    const browserTab = window.open(url, "_blank", "noopener,noreferrer");
    if (!browserTab) toast.error("Allow pop-ups to open the link.");
  } catch (err: any) {
    console.error(
      `🚨 [EXTERNAL_LINK_LOG][FATAL: React.ExternalLink.Exception] Unhandled exception during handover: ${err.message}`,
    );
    toast.error("The link could not be opened. Please try again.");
  }
};

/** Opens a Basescan token/address page via the shared external-link bridge. */
export const openBasescan = (contract: string): void => {
  void openExternalLink(`https://basescan.org/token/${contract}`);
};
