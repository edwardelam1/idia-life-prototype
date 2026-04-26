/** * [START] Sovereign Infrastructure: Manual Global Hydration
 * Trailing slash on 'buffer/' bypasses Vite's Node-externalizer.
 */
import { Buffer } from "buffer/";

console.log("[START] main.tsx: Initializing Native Core");

try {
  if (typeof window !== "undefined") {
    console.log("[START] Sealing Native Globals");
    (window as any).global = window;
    (window as any).Buffer = Buffer;
    (window as any).process = (window as any).process || {
      env: { NODE_ENV: "development" },
      browser: true,
    };
    console.log("[SUCCESS] Native Globals Sealed.");
  }
} catch (e) {
  console.error("[FATAL] Global Sealing Failed:", e);
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

const container = document.getElementById("root");
if (container) {
  console.log("[START] React Mount Sequence");
  try {
    createRoot(container).render(<App />);
    console.log("[END] React Mount Sequence");
  } catch (err) {
    console.error("[FATAL] React mount failed:", err);
  }
} else {
  console.error("[CRITICAL] #root element missing.");
}

console.log("[END] main.tsx: Initializing Native Core");
