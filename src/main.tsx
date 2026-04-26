/** * [START] Sovereign Infrastructure: Manual Global Hydration
 * Ensuring the Native Enclave is prepared for Cryptographic Modules
 */
import { Buffer } from "buffer";

console.log("[START] Global Polyfill Injection Sequence");

try {
  if (typeof window !== "undefined") {
    console.log("[INFO] Verifying window context presence");

    console.log("[START] Polyfill window.global");
    window.global = window;
    console.log("[END] Polyfill window.global");

    console.log("[START] Polyfill window.Buffer");
    (window as any).Buffer = Buffer;
    console.log("[END] Polyfill window.Buffer");

    console.log("[START] Polyfill window.process");
    (window as any).process = (window as any).process || { env: {} };
    console.log("[END] Polyfill window.process");

    console.log("[SUCCESS] Sovereign Infrastructure: Globals Hydrated.");
  } else {
    console.warn("[WARN] Window context missing; skipping hydration.");
  }
} catch (e) {
  console.error("[START] Global Hydration Error Handler");
  console.error("[FATAL] Core Infrastructure Stall: Global injection failed.", e);
  console.error("[END] Global Hydration Error Handler");
}

console.log("[END] Global Polyfill Injection Sequence");
/** [END] Sovereign Infrastructure */

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import comprehensive event tracking to ensure ALL data flows through synapse
import "./utils/AuthEventTracker";

console.log("[START] React Root Mounting Sequence");
createRoot(document.getElementById("root")!).render(<App />);
console.log("[END] React Root Mounting Sequence");
