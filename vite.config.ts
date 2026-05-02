import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // Use a relative base to ensure the native WKWebView finds assets locally
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false, // Disable for production stabilization
    rollupOptions: {
      output: {
        // Force manual chunks to prevent oversized JS files that crash the iOS bridge
        manualChunks: {
          vendor: ["react", "react-dom", "lucide-react"],
        },
      },
    },
  },
});
