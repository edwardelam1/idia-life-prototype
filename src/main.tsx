/** * [START] main.tsx: Script Execution Initiated
 * Infrastructure baseline with absolute granularity
 */
console.log("[START] main.tsx: Entry Point Reached");

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/AuthEventTracker";

const container = document.getElementById("root");
import { http, createConfig } from "wagmi";
import { mainnet, base } from "wagmi/chains"; // Added 'base' support

/**
 * SOVEREIGN INFRASTRUCTURE CONFIGURATION
 * Logic: Explicitly define supported chains and provide dedicated transports
 * to bypass public RPC rate limits (429 errors).
 */
export const config = createConfig({
  chains: [mainnet, base], // Added 'base' to supported chains
  transports: {
    [mainnet.id]: http("https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"),
    // SURGICAL FIX: Added dedicated Base RPC transport to avoid eth.merkle.io rate limits
    [base.id]: http("https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"),
  },
});

console.log(`[INFO] DOM Root Search: ${container ? "FOUND" : "MISSING"}`);

if (container) {
  try {
    console.log("[START] React Root Mounting Sequence");
    createRoot(container).render(<App />);
    console.log("[SUCCESS] React Root Mounting Sequence complete.");
  } catch (mountError: any) {
    console.error("[START] React Mount Error Handler");
    console.error("[FATAL] React failed to mount to DOM:", mountError.message);
    console.error("[STACK]", mountError.stack);
    console.error("[END] React Mount Error Handler");
  }
} else {
  console.error("[CRITICAL] #root element missing from index.html.");
}

console.log("[END] main.tsx: Script Execution Initiated");
