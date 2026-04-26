/** * [START] Sovereign Infrastructure: Manual Global Hydration
 * @ts-ignore - Bypassing TS2307: Trailing slash bypasses Vite's Node-externalizer scanner.
 */
import { Buffer } from "buffer/";

console.log("[START] main.tsx: Initializing Native Core");

try {
  if (typeof window !== "undefined") {
    console.log("[START] sealAirlock: Injecting Native Globals");

    // Injecting into window for Circle SDK and other cryptographic dependencies
    (window as any).global = window;
    (window as any).Buffer = Buffer;

    // Polyfill process for browser environment
    (window as any).process = (window as any).process || {
      env: { NODE_ENV: "development" },
      browser: true,
    };

    console.log("[SUCCESS] sealAirlock: Native Globals Hydrated.");
  }
} catch (e: any) {
  console.error("[FATAL] sealAirlock: Core Infrastructure Stall", e);
}

// React Standard Infrastructure
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

console.log("[START] React Root Mounting Sequence");

const container = document.getElementById("root");
if (container) {
  try {
    console.log("[INFO] Mounting App to #root");
    createRoot(container).render(<App />);
    console.log("[END] React Root Mounting Sequence");
  } catch (renderError) {
    console.error("[FATAL] Render Engine Collapse:", renderError);
  }
} else {
  console.error("[CRITICAL] DOM Root (#root) missing. Execution Aborted.");
}

console.log("[END] main.tsx: Initializing Native Core");
