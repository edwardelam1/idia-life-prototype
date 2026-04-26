import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "events", "process"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensures global is available at runtime
    global: "globalThis",
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true, // Fixes module.exports vs import collisions
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
}));
