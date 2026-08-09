import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  resolve: {
    // Dev launcher uses a temporary path without '#'; keep module ids on it.
    preserveSymlinks: true,
  },
});
