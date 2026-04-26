import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Define 'global' at the highest level
  define: {
    global: "window",
    "process.env": {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Explicitly point to the browser-version of the buffer package
      "native-buffer": path.resolve(__dirname, "node_modules/buffer/index.js"),
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  build: {
    // Ensure Rollup treats our stealth alias correctly
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
