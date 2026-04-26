import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
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
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
    },
  },
});
