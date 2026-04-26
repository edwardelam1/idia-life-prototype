import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  optimizeDeps: {
    // [NO EXCEPTIONS] - Stop the engine from trying to "fix" these libraries
    exclude: ["@rainbow-me/rainbowkit", "wagmi", "viem"],
  },
  build: {
    commonjsOptions: {
      include: [], // Disable CommonJS "trickery" entirely
    },
  },
});
