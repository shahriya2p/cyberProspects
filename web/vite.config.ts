import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the API runs separately on :8000; proxy the API paths so the browser
// talks to a single origin and we don't fight CORS locally.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/healthz": "http://localhost:8000",
    },
  },
});
