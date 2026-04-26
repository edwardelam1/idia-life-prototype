import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Define 'global' and 'process' at the compiler level
  define: {
    global: "window",
    "process.env": {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // This forces Vite to look at the actual npm package
      buffer: path.resolve(__dirname, "node_modules/buffer/index.js"),
    },
  },
  optimizeDeps: {
    // Explicitly include buffer to prevent externalization
    include: ["buffer"],
  },
}));
