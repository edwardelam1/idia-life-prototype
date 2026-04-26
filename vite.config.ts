import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Define globals at the compiler level so they exist everywhere
  define: {
    global: "window",
    "process.env": {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // This is the kill-shot for the "Failed to resolve" error.
      // It points directly to the browser-ready index file.
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
}));
