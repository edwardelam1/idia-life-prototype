import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";

export const openExternalLink = async (url: string) => {
  console.log(`[BEGIN: openExternalLink] Routing external URL: ${url}`);

  // Enforce domain whitelist
  if (!url.startsWith("https://basescan.org/")) {
    console.error(`[ERROR: openExternalLink] URL not whitelisted: ${url}`);
    toast.error("Security policy blocked navigating to an untrusted domain.");
    return;
  }

  try {
    const webkit = (window as any).webkit;

    // 1. iOS Custom Native Shell
    if (webkit?.messageHandlers?.openExternalLink) {
      console.log("[PROCESS: openExternalLink] Routing to iOS native shell via WKScriptMessageHandler.");
      webkit.messageHandlers.openExternalLink.postMessage({ url });
      console.log("[END: openExternalLink] Dispatched to iOS shell.");
      return;
    }

    // 2. Capacitor (Android)
    if (Capacitor.isNativePlatform()) {
      console.log("[PROCESS: openExternalLink] Routing to Capacitor Browser.");
      await Browser.open({ url });
      console.log("[END: openExternalLink] Dispatched to Capacitor Browser.");
      return;
    }

    // 3. Standard Web Browser
    console.log("[PROCESS: openExternalLink] Routing to standard web new tab.");
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (!newWindow) {
      console.error("[ERROR: openExternalLink] Browser blocked the popup.");
      toast.error("Popup blocked. Please allow popups in your browser to view this link.");
    } else {
      console.log("[END: openExternalLink] Web tab opened.");
    }
  } catch (error: any) {
    console.error(`[FATAL: openExternalLink] Execution failed: ${error.message}`);
  }
};
