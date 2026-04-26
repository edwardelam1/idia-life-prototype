import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // This satisfies the "global is not defined" error before it even starts
  define: {
    global: "window",
    "process.env": {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Standard alias without absolute filesystem paths
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    // This forces Vite to bundle the buffer package for the browser
    include: ["buffer"],
  },
}));
