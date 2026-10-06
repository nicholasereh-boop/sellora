import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Roadmap Phase 4 (CSRF and security): proxying /api during dev means the
// browser only ever talks to http://localhost:5173, so the Django session
// and csrftoken cookies are first-party from the browser's point of view
// even though Django itself runs on :8000. This is simpler than pure CORS
// and is closer to the same-origin production layout (Nginx routing
// /api/ to Django) described in the roadmap's production architecture.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Digital-file downloads are the one /orders/... URL Django still
      // serves (a file response, not a page); every other /orders/... URL
      // is a React route.
      "^/orders/[^/]+/download/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Google sign-in/sign-up (roadmap: keep allauth's server-side
      // flow, only adapt the React redirect/callback). This whole path
      // is a real browser navigation, not a fetch, but it still needs
      // to be same-origin so the session cookie Django sets mid-flow
      // is usable by the React app's own /api/ calls afterward without
      // relying on cross-site cookie rules. FRONTEND_URL in settings.py
      // sends the browser back to localhost:5173 once the flow
      // finishes, landing here again.
      "/accounts": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
