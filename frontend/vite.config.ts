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
