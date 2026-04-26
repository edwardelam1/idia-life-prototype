/** * [START] Sovereign Infrastructure: Unified Entry Point
 * Polyfills are now handled via vite-plugin-node-polyfills
 */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

console.log("[START] main.tsx: Initializing Sovereign Vault");

const container = document.getElementById("root");

if (container) {
  try {
    console.log("[START] React Mount Sequence");
    createRoot(container).render(<App />);
    console.log("[END] React Mount Sequence");
  } catch (err) {
    console.error("[FATAL] Render Engine Collapse:", err);
  }
} else {
  console.error("[CRITICAL] #root element missing. Check index.html.");
}

console.log("[END] main.tsx: Initializing Sovereign Vault");
