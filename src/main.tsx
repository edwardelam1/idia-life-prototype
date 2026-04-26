/** * [START] Sovereign Infrastructure: Manual Global Hydration
 * Top-level imports for ESM compliance.
 */
import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

console.log("[START] main.tsx: Script Execution Initiated");

try {
  console.log("[START] Global Polyfill Assignment Sequence");

  if (typeof window !== "undefined") {
    console.log("[START] window.global assignment");
    (window as any).global = window;
    console.log("[END] window.global assignment");

    console.log("[START] window.Buffer assignment");
    (window as any).Buffer = Buffer;
    console.log("[END] window.Buffer assignment");

    console.log("[START] window.process assignment");
    (window as any).process = (window as any).process || {
      env: { NODE_ENV: "development" },
      browser: true,
    };
    console.log("[END] window.process assignment");

    console.log("[SUCCESS] Sovereign Infrastructure: Globals Hydrated.");
  } else {
    console.warn("[WARN] Execution context is not a window; skipping polyfills.");
  }

  console.log("[END] Global Polyfill Assignment Sequence");
} catch (e) {
  console.error("[START] Global Hydration Error Handler");
  console.error("[FATAL] Core Infrastructure Stall: Global injection failed.", e);
  console.error("[END] Global Hydration Error Handler");
}

console.log("[START] React Root Mounting Sequence");
try {
  const container = document.getElementById("root");
  console.log(`[INFO] DOM Root Search: ${container ? "FOUND" : "MISSING"}`);

  if (container) {
    createRoot(container).render(<App />);
    console.log("[END] React Root Mounting Sequence");
  } else {
    throw new Error("Target container #root not found.");
  }
} catch (mountError) {
  console.error("[START] React Mount Error Handler");
  console.error("[FATAL] React failed to mount to DOM:", mountError);
  console.error("[END] React Mount Error Handler");
}

console.log("[END] main.tsx: Script Execution Initiated");
