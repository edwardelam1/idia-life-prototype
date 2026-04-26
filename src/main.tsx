/** * [START] Sovereign Infrastructure: Stealth Hydration
 * Importing via stealth alias to bypass Vite's "buffer" scanner.
 */
// @ts-ignore
import { Buffer } from "native-buffer";

console.log("[START] main.tsx: Initializing Native Core");

try {
  console.log("[START] sealAirlock: Injecting Native Globals");
  window.Buffer = Buffer;
  console.log("[SUCCESS] sealAirlock: Buffer Hydrated via Stealth Alias.");
} catch (e) {
  console.error("[FATAL] sealAirlock: Stealth Injection Failed.", e);
}

// React Infrastructure
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

const container = document.getElementById("root");
if (container) {
  console.log("[START] React Mount");
  createRoot(container).render(<App />);
  console.log("[END] React Mount");
}

console.log("[END] main.tsx: Initializing Native Core");
