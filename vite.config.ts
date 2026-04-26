import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // This defines the globals that the Circle SDK is looking for
  define: {
    global: "window",
    "process.env": {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // This forces Vite to use the npm 'buffer' package instead of the Node built-in
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
}));
