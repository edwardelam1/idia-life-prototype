import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

/**
 * Opens Basescan in the browser surface supplied by each host.
 * Basescan blocks iframe embedding, so rendering it inside a React overlay leaves a blank view.
 */
export const openBasescan = (contract: string): void => {
  const url = `https://basescan.org/token/${contract}`;
  const inCustomIOSShell =
    /IDIA-Native-Shell/i.test(navigator.userAgent) || Boolean(window.webkit?.messageHandlers);

  if (inCustomIOSShell && !Capacitor.isNativePlatform()) {
    // The custom ContentView intercepts top-level external navigation and presents
    // the same Safari-style in-app sheet used for authentication.
    window.location.assign(url);
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
