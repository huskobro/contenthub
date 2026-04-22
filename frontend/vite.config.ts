import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Stabilize-v1: the index chunk was ~2.38 MB because React, Router,
    // React Query, Recharts, and Lucide all collapsed into one bundle.
    // Splitting by vendor library keeps the first-paint bundle small and
    // lets the browser cache heavy deps (recharts especially) across
    // route navigations. No app-code change — purely chunking strategy.
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — everything hydration-critical.
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // React Query — server-state cache; needed on every page but
          // independently cacheable.
          "vendor-query": ["@tanstack/react-query"],
          // Recharts is the single heaviest dep (~400 kB). Only analytics
          // pages actually need it — keep it isolated so non-analytics
          // navigation never pays for it.
          "vendor-charts": ["recharts"],
          // Lucide icons — tree-shakable per-icon, but the aggregate
          // usage across the app is large enough to warrant its own chunk.
          "vendor-icons": ["lucide-react"],
          // Zustand is small but shared by many stores; a standalone
          // chunk keeps store rehydration decoupled from feature code.
          "vendor-state": ["zustand"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    // Phase AJ — paralel full-suite kosumunda (213 test file) collect+transform
    // yuku agir; default 5s testTimeout / 10s hookTimeout, 5 ayri smoke test
    // dosyasinda kosullara bagli olarak timeout'a dusuyordu (bridge/canvas
    // legacy-fallback, surfaces-layout-switch, default-surface-strategy).
    // Izole kosumda hepsi gecerken full-suite'te kotuyordu. Yukseltiyoruz;
    // assertion/behavior bazli fail yok — tamami collect phase gecikmesi.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
