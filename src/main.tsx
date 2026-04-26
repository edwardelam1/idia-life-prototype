/** * [START] main.tsx: Script Execution Initiated
 * Infrastructure baseline with absolute granularity
 */
console.log("[START] main.tsx: Entry Point Reached");

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

const container = document.getElementById("root");

console.log(`[INFO] DOM Root Search: ${container ? "FOUND" : "MISSING"}`);

if (container) {
  try {
    console.log("[START] React Root Mounting Sequence");
    createRoot(container).render(<App />);
    console.log("[SUCCESS] React Root Mounting Sequence complete.");
  } catch (mountError) {
    console.error("[START] React Mount Error Handler");
    console.error("[FATAL] React failed to mount to DOM:", mountError);
    console.error("[END] React Mount Error Handler");
  }
} else {
  console.error("[CRITICAL] #root element missing from index.html.");
}

console.log("[END] main.tsx: Script Execution Initiated");
