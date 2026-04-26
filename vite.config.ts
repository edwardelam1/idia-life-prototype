import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

console.log("[START] Vite Config Evaluation");

let config;

try {
  console.log("[START] Constructing Vite Config Object");
  
  config = defineConfig({
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    // STOP TRACING: Tell Vite/Rollup to ignore the internal variable mapping of these libs
    optimizeDeps: {
      include: ["react", "react-dom", "wagmi", "viem", "@rainbow-me/rainbowkit"],
    },
    build: {
      rollupOptions: {
        // If Rollup can't trace it, don't let it try
        onwarn(warning, warn) {
          console.log(`[START] Rollup Warning Handler: Intercepted ${warning.code}`);
          try {
            if (warning.code === "CIRCULAR_DEPENDENCY") {
              console.log("[INFO] Suppressing CIRCULAR_DEPENDENCY warning telemetry.");
              return;
            }
            warn(warning);
          } catch (e: any) {
            console.error("[START] Rollup Warning Handler Error");
            console.error(`[ERROR] Failed to process Rollup warning: ${e.message}`);
            console.error("[END] Rollup Warning Handler Error");
          } finally {
            console.log(`[END] Rollup Warning Handler: Intercepted ${warning.code}`);
          }
        },
      },
    },
  });

  console.log("[END] Constructing Vite Config Object");

} catch (e: any) {
  console.error("[START] Vite Config File Evaluation Error Handler");
  console.error(`[FATAL] Vite Configuration Initialization Failed: ${e.message}`);
  console.error("[END] Vite Config File Evaluation Error Handler");
  throw e;
} finally {
  console.log("[END] Vite Config Evaluation");
}

// Export must be at the root level of the ES Module
export default config;