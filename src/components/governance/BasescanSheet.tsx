import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

type BasescanKind = "token" | "address" | "tx";

/**
 * Opens Basescan in the browser surface supplied by each host.
 * - iOS custom ContentView: posts to the `openExternalLink` handler, which presents
 *   an SFSafariViewController page sheet (only https://basescan.org/ URLs are accepted).
 * - Capacitor (Android): in-app browser sheet.
 * - Web: new tab.
 */
export const openBasescan = (target: string, kind: BasescanKind = "token"): void => {
  const url = `https://basescan.org/${kind}/${target}`;
  const handler = (window as any).webkit?.messageHandlers?.openExternalLink;

  if (handler && !Capacitor.isNativePlatform()) {
    console.log(`[BASESCAN] iOS shell sheet -> ${url}`);
    handler.postMessage({ url });
    return;
  }

  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/browser")
      .then(({ Browser }) => Browser.open({ url, presentationStyle: "popover" }))
      .catch((error) => {
        console.error("[BASESCAN] Native browser sheet failed to open", error);
        toast.error("Basescan could not be opened. Please try again.");
      });
    return;
  }

  const browserTab = window.open(url, "_blank", "noopener,noreferrer");
  if (!browserTab) toast.error("Allow pop-ups to open Basescan.");
};
