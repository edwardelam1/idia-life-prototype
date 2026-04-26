/** * [START] Sovereign Infrastructure: Manual Global Hydration */
import { Buffer } from "buffer";

console.log("[START] main.tsx: Script Execution Initiated");

try {
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
  console.error("[FATAL] Global hydration failed:", e);
}

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
