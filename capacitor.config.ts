import { CapacitorConfig } from "@capacitor/cli";

/**
 * [START] capacitor.config.ts: Infrastructure Baseline
 * Sovereign Portal Configuration for IDIA Life
 */
console.log("[INFO] Loading Capacitor Configuration: Live Portal Mode");

const config: CapacitorConfig = {
  appId: "app.lovable.106c540d44fd41bf9be1771a4d91effc",
  appName: "idia-life-prototype",
  webDir: "dist",
  server: {
    // Establishing direct link to the project cloud environment
    url: "https://106c540d-44fd-41bf-9be1-771a4d91effc.lovableproject.com?forceHideBadge=true",
    cleartext: true,
    // Authorized navigation to prevent external browser pop-up stalling
    allowNavigation: ["*.coinbase.com", "*.base.org", "106c540d-44fd-41bf-9be1-771a4d91effc.lovableproject.com"],
  },
};

export default config;
