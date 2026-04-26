/** * [START] Sovereign Infrastructure: Absolute Entry Point
 * ATTACHING EMERGENCY LISTENERS BEFORE ANY IMPORTS
 */
window.onerror = function (message, source, lineno, colno, error) {
  console.error("[CRITICAL] Uncaught Global Error Detected:");
  console.error(`[MESSAGE]: ${message}`);
  console.error(`[SOURCE]: ${source} @ ${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = function (event) {
  console.error("[CRITICAL] Unhandled Promise Rejection:");
  console.error(event.reason);
};

console.log("[START] main.tsx: Initializing Native Core");

// 1. Force the Buffer import immediately
import { Buffer } from "buffer";

// 2. Immediate Global Sealing
try {
  console.log("[START] Sealing Native Globals");
  (window as any).global = window;
  (window as any).Buffer = Buffer;
  (window as any).process = (window as any).process || { env: { NODE_ENV: "development" }, browser: true };
  console.log("[SUCCESS] Native Globals Sealed.");
} catch (e) {
  console.error("[FATAL] Global Sealing Failed:", e);
}

/**
 * 3. Dynamic App Loading
 * We use dynamic imports here to ensure the Globals above are 100% defined
 * before the App components (and the Circle SDK) are even parsed.
 */
const bootSequence = async () => {
  console.log("[START] bootSequence: Dynamic Module Loading");

  try {
    console.log("[START] Loading App Infrastructure");
    const [{ createRoot }, { default: App }, _css, _tracker] = await Promise.all([
      import("react-dom/client"),
      import("./App.tsx"),
      import("./index.css"),
      import("./utils/AuthEventTracker"),
    ]);
    console.log("[END] Loading App Infrastructure");

    const container = document.getElementById("root");
    console.log(`[INFO] DOM Container Search: ${container ? "FOUND" : "MISSING"}`);

    if (container) {
      console.log("[START] React Mount: createRoot.render");
      createRoot(container).render(<App />);
      console.log("[END] React Mount: createRoot.render");
    } else {
      throw new Error("Target container #root not found in the DOM.");
    }
  } catch (err: any) {
    console.error("[START] Boot Sequence Error Handler");
    console.error("[FATAL] Sovereign Boot Interrupted:", err.message);
    console.error("[STACK]:", err.stack);
    console.error("[END] Boot Sequence Error Handler");
  }

  console.log("[END] bootSequence: Dynamic Module Loading");
};

bootSequence();
console.log("[END] main.tsx: Initializing Native Core");
