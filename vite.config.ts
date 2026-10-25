import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@convex-dev/auth/react": path.resolve(import.meta.dirname, "./src/lib/mock-auth.tsx"),
      "@convex-dev/auth": path.resolve(import.meta.dirname, "./src/lib/mock-auth.tsx"),
      "convex/react": path.resolve(import.meta.dirname, "./src/lib/mock-convex.tsx"),
      "@/convex": path.resolve(import.meta.dirname, "./convex"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
