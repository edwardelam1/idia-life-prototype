/** * [START] Sovereign Infrastructure: Manual Global Hydration
 * Absolute Granularity for Error Handling
 */
console.log("[START] main.tsx: Script Execution Initiated");

try {
  console.log("[START] Importing Buffer core");
  // Standard import - ensure the word 'import' is fully intact
  import { Buffer } from "buffer";
  console.log("[END] Importing Buffer core");

  if (typeof window !== "undefined") {
    console.log("[START] Global Polyfill Assignment");

    (window as any).global = window;
    (window as any).Buffer = Buffer;
    (window as any).process = (window as any).process || {
      env: { NODE_ENV: "development" },
      browser: true,
    };

    console.log("[SUCCESS] Sovereign Infrastructure: Globals Hydrated.");
  }
} catch (e) {
  console.error("[START] Global Hydration Error Handler");
  console.error("[FATAL] Core Infrastructure Stall: Global injection failed.", e);
  console.error("[END] Global Hydration Error Handler");
}

console.log("[END] Global Polyfill Injection Sequence");

// --- Standard React Imports ---
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

console.log("[START] React Root Mounting");
const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
  console.log("[END] React Root Mounting");
} else {
  console.error("[CRITICAL] #root element missing from DOM.");
}

console.log("[END] main.tsx: Script Execution Initiated");
